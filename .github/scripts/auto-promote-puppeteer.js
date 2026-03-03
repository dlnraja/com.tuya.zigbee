#!/usr/bin/env node
/**
 * auto-promote-puppeteer.js — Promotes draft build to "test" via browser automation.
 * Athom has NO public API for this — only the web UI works.
 *
 * Required env: HOMEY_EMAIL, HOMEY_PASSWORD
 * Optional: DRY_RUN, GITHUB_STEP_SUMMARY
 */
'use strict';
const fs = require('fs'), path = require('path');
const { promoteViaBrowserSession } = require('./promote-via-session');
const APP_ID = 'com.dlnraja.tuya.zigbee';
const VERSIONS_URL = `https://tools.developer.homey.app/apps/app/${APP_ID}/versions`;
const EMAIL = process.env.HOMEY_EMAIL;
const PASSWORD = process.env.HOMEY_PASSWORD;
const DRY = process.env.DRY_RUN === 'true';
const SUM = process.env.GITHUB_STEP_SUMMARY || null;

function log(m) { console.log(m); if (SUM) try { fs.appendFileSync(SUM, m+'\n'); } catch {} }

async function snap(page, name) {
  const dir = process.env.GITHUB_WORKSPACE
    ? path.join(process.env.GITHUB_WORKSPACE, 'screenshots')
    : path.join(__dirname, '..', '..', 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true }).catch(() => {});
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    log('## Auto-Promote (Puppeteer)');
    log('HOMEY_EMAIL and HOMEY_PASSWORD required. Skipping.');
    process.exit(0);
  }
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch {
    log('puppeteer not installed'); process.exit(1);
  }

  const ver = (() => { try { return require('../../app.json').version; } catch { return '?'; } })();
  log('## Auto-Promote Draft -> Test (Puppeteer)');
  log(`App: ${APP_ID} | v${ver} | DRY=${DRY}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Step 1: Go to versions page (will redirect to login)
    log('\n### Step 1: Navigate');
    await page.goto(VERSIONS_URL, { waitUntil: 'networkidle2' });
    await snap(page, '01-initial');
    log(`  URL: ${page.url()}`);

    // Step 2: Login — detect via URL redirect OR in-page "LOG IN" button
    log('\n### Step 2: Check login');
    const url = page.url();
    const pageText = await page.evaluate(() => document.body?.innerText || '');
    const hasLoginBtn = pageText.includes('LOG IN') || pageText.includes('Log in') || pageText.includes('Sign in');
    const isOnAuth = url.includes('accounts.athom.com') || url.includes('login') || url.includes('auth');
    log(`  URL-redirect: ${isOnAuth} | In-page LOG IN btn: ${hasLoginBtn}`);

    if (isOnAuth || hasLoginBtn) {
      log('  Login required');

      // If we're on tools page with LOG IN button, click it first
      if (hasLoginBtn && !isOnAuth) {
        log('  Clicking LOG IN button in sidebar...');
        const clicked = await page.evaluate(() => {
          // Find the LOG IN button/link in sidebar
          const els = [...document.querySelectorAll('a, button, [role="button"]')];
          for (const el of els) {
            const t = (el.textContent || '').trim().toUpperCase();
            if (t === 'LOG IN' || t === 'LOGIN' || t === 'SIGN IN') {
              el.click();
              return el.tagName + ': ' + el.textContent.trim();
            }
          }
          return null;
        });
        log(`  Clicked: ${clicked}`);
        // Wait for navigation to accounts.athom.com
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));
        await snap(page, '02-after-login-click');
        log(`  Now at: ${page.url()}`);
      }

      // Now we should be on accounts.athom.com — fill credentials
      await doLogin(page);
      await snap(page, '04-post-login');
      log(`  Post-login URL: ${page.url()}`);

      // Check for 2FA or errors
      if (page.url().includes('accounts.athom.com')) {
        const t = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
        if (/two.?factor|2fa|verification code/i.test(t)) {
          log('  2FA detected - cannot automate'); process.exitCode = 1; return;
        }
        if (/incorrect|invalid|wrong/i.test(t)) {
          log('  Login failed - bad credentials'); process.exitCode = 1; return;
        }
        log('  Still on accounts page, waiting...');
        await new Promise(r => setTimeout(r, 5000));
        await snap(page, '04b-still-on-accounts');
      }

      // Navigate to versions after login
      if (!page.url().includes('versions')) {
        log('  Navigating to versions page...');
        await page.goto(VERSIONS_URL, { waitUntil: 'networkidle2' });
      }
    } else {
      log('  Already logged in');
    }

    await new Promise(r => setTimeout(r, 3000));
    await snap(page, '05-versions');
    log(`  Versions URL: ${page.url()}`);

    // Step 3: Find and click promote
    log('\n### Step 3: Find draft & promote');
    const result = await findAndPromote(page);
    await snap(page, '07-final');

    if (result) {
      log('\n### Result: Draft promoted to Test');
      log(`Manage: https://tools.developer.homey.app/apps/app/${APP_ID}`);
    } else {
      log('\nManual: https://tools.developer.homey.app/apps/app/' + APP_ID + '/versions');
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

async function doLogin(page) {
  log('  Login page URL: ' + page.url());
  await snap(page, '02b-login-page');

  // Wait for page to fully render (accounts.athom.com is also an SPA)
  await new Promise(r => setTimeout(r, 3000));

  // Find email field with extended selectors
  const eSel = ['input[type="email"]','input[name="email"]','input[name="username"]','#email',
    'input[autocomplete="email"]','input[autocomplete="username"]','input[placeholder*="mail"]'];
  let ef = null;
  for (const s of eSel) { try { ef = await page.waitForSelector(s, {visible:true,timeout:5000}); if(ef) break; } catch {} }

  if (!ef) {
    // Dump page structure for debugging
    const struct = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input')];
      return inputs.map(i => `<input type="${i.type}" name="${i.name}" id="${i.id}" placeholder="${i.placeholder}">`);
    });
    log('  Input fields found: ' + JSON.stringify(struct));

    // Try clicking any visible login/submit button
    for (const s of ['a[href*="login"]','a[href*="auth"]','button[type="submit"]','button']) {
      try {
        const b = await page.$(s);
        if (b) {
          const vis = await b.evaluate(el => el.offsetParent !== null);
          if (vis) { await b.click(); await page.waitForNavigation({waitUntil:'networkidle2',timeout:10000}).catch(()=>{}); await new Promise(r=>setTimeout(r,2000)); break; }
        }
      } catch {}
    }
    for (const s of eSel) { try { ef = await page.waitForSelector(s, {visible:true,timeout:8000}); if(ef) break; } catch {} }
  }
  if (!ef) { log('  Could not find email field'); await snap(page, '02c-no-email-field'); process.exitCode = 1; return; }

  await ef.click({clickCount:3});
  await ef.type(EMAIL, {delay:30});
  log('  Email entered');

  // Find password field
  let pf = null;
  for (const s of ['input[type="password"]','input[name="password"]','#password','input[autocomplete="current-password"]']) {
    try { pf = await page.$(s); if(pf) break; } catch {}
  }
  if (!pf) {
    // Email-first flow: submit email, wait for password step
    log('  Email-first flow: submitting email...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click(); else await page.keyboard.press('Enter');
    await page.waitForNavigation({waitUntil:'networkidle2',timeout:10000}).catch(()=>{});
    await new Promise(r => setTimeout(r, 3000));
    await snap(page, '02d-after-email-submit');
    for (const s of ['input[type="password"]','input[name="password"]','input[autocomplete="current-password"]']) {
      try { pf = await page.waitForSelector(s, {visible:true,timeout:8000}); if(pf) break; } catch {}
    }
  }
  if (!pf) { log('  Could not find password field'); await snap(page, '02e-no-password'); process.exitCode = 1; return; }

  await pf.click({clickCount:3});
  await pf.type(PASSWORD, {delay:30});
  await snap(page, '03-filled');
  log('  Password entered');

  // Submit login form
  const btn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
  if (btn) { await btn.click(); log('  Submit button clicked'); }
  else { await page.keyboard.press('Enter'); log('  Enter pressed'); }

  // Wait for redirect back to tools.developer.homey.app
  log('  Waiting for post-login redirect...');
  try {
    await page.waitForNavigation({waitUntil:'networkidle2',timeout:30000});
  } catch { log('  Navigation timeout (may still be loading)'); }
  await new Promise(r => setTimeout(r, 3000));

  // Sometimes there's a second redirect (OAuth callback)
  if (page.url().includes('accounts.athom.com')) {
    log('  Still on accounts page, waiting for callback...');
    try {
      await page.waitForNavigation({waitUntil:'networkidle2',timeout:15000});
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  log('  Final login URL: ' + page.url());
}

async function findAndPromote(page) {
  // Strategy A: Use browser session API (bypasses SPA rendering)
  try {
    const apiRes = await promoteViaBrowserSession(page, log, DRY);
    if (apiRes === true) return true;
    log('  Session API: ' + (apiRes || 'no result') + ', falling back to SPA...');
  } catch (e) { log('  Session API error: ' + e.message); }

  // Strategy B: SPA content rendering
  log('  Waiting for SPA content to load...');

  // Force re-navigate to versions URL (SPA may not route after login redirect)
  if (!page.url().includes('/versions')) {
    log('  Re-navigating to versions URL...');
    await page.goto(VERSIONS_URL, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 5000));
  }

  // If content is sparse, try clicking "My Apps" to trigger SPA routing
  let text = await page.evaluate(() => document.body?.innerText || '');
  if (text.length < 400) {
    log('  Sparse content (' + text.length + ' chars), trying My Apps link...');
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(l => /my apps/i.test(l.textContent));
      if (a) a.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.goto(VERSIONS_URL, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 5000));
  }

  let hasDraft = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    text = await page.evaluate(() => document.body?.innerText || '');
    hasDraft = text.toLowerCase().includes('draft');
    const hasVersion = /\d+\.\d+\.\d+/.test(text);
    const hasContent = text.length > 400;
    log(`  Poll ${attempt+1}/15: ${text.length} chars, hasVersion=${hasVersion}, hasDraft=${hasDraft}`);
    if (hasContent && (hasVersion || hasDraft)) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // Log page content snippet for debugging
  const snippet = text.replace(/\s+/g, ' ').substring(0, 500);
  log(`  Page snippet: "${snippet}"`);

  if (!hasDraft) {
    // Check if page has "test" or "live" but no "draft" — means no draft available
    const hasTest = text.toLowerCase().includes('test');
    const hasLive = text.toLowerCase().includes('live');
    if (hasTest || hasLive) {
      log('  Page loaded but no draft builds (has test/live). Already promoted?');
    } else {
      log('  No draft builds found (SPA may not have loaded)');
    }
    // Dump HTML for debugging
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    log(`  HTML length: ${html.length}`);
    const dir = process.env.GITHUB_WORKSPACE
      ? path.join(process.env.GITHUB_WORKSPACE, 'screenshots')
      : path.join(__dirname, '..', '..', 'screenshots');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'page-dump.html'), html);
    log('  Saved page-dump.html for analysis');
    return false;
  }

  if (DRY) { log('  DRY RUN - not clicking'); return false; }

  // Strategy 1: Look for "Release to Test" / "Promote" / "Test" button near draft
  const promoteSel = [
    'button:has-text("Release to Test")', 'button:has-text("Test")',
    'button:has-text("Promote")', 'a:has-text("Release to Test")',
    '[data-channel="test"]', '[data-action="promote"]',
  ];

  // Use page.evaluate to find clickable elements with promote-related text
  const clicked = await page.evaluate(() => {
    const keywords = ['release to test', 'promote to test', 'test', 'promote'];
    // Check buttons
    const btns = [...document.querySelectorAll('button, a, [role="button"]')];
    for (const kw of keywords) {
      for (const b of btns) {
        const t = (b.textContent || '').trim().toLowerCase();
        if (t === kw || t.includes('release to test') || t.includes('promote to test')) {
          b.click();
          return `Clicked: "${b.textContent.trim()}"`;
        }
      }
    }
    // Check for dropdown/select with "test" option
    const selects = [...document.querySelectorAll('select')];
    for (const sel of selects) {
      const opts = [...sel.options];
      const testOpt = opts.find(o => o.value === 'test' || o.textContent.toLowerCase().includes('test'));
      if (testOpt) {
        sel.value = testOpt.value;
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        return `Selected: "${testOpt.textContent.trim()}"`;
      }
    }
    return null;
  });

  if (clicked) {
    log(`  ${clicked}`);
    await new Promise(r => setTimeout(r, 3000));
    await snap(page, '06-after-click');

    // Confirm dialog if present
    const confirmed = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a, [role="button"]')];
      for (const b of btns) {
        const t = (b.textContent || '').trim().toLowerCase();
        if (t === 'confirm' || t === 'yes' || t === 'ok' || t === 'release') {
          b.click();
          return `Confirmed: "${b.textContent.trim()}"`;
        }
      }
      return null;
    });
    if (confirmed) {
      log(`  ${confirmed}`);
      await new Promise(r => setTimeout(r, 3000));
    }
    return true;
  }

  // Strategy 2: Click on the draft row first, then look for promote
  log('  No direct promote button found, trying row click...');
  const rowClicked = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr, [class*="row"], [class*="item"], [class*="build"]')];
    for (const r of rows) {
      if ((r.textContent || '').toLowerCase().includes('draft')) {
        r.click();
        return true;
      }
    }
    return false;
  });

  if (rowClicked) {
    log('  Clicked draft row');
    await new Promise(r => setTimeout(r, 3000));
    await snap(page, '06-after-row-click');

    // Now look for promote button in expanded/modal view
    const btn2 = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a, [role="button"]')];
      for (const b of btns) {
        const t = (b.textContent || '').trim().toLowerCase();
        if (t.includes('test') || t.includes('promote') || t.includes('release')) {
          b.click();
          return `Clicked: "${b.textContent.trim()}"`;
        }
      }
      return null;
    });
    if (btn2) {
      log(`  ${btn2}`);
      await new Promise(r => setTimeout(r, 3000));
      return true;
    }
  }

  // Strategy 3: dump page structure for debugging
  log('  Could not find promote button. Page structure:');
  const struct = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, select, [role="button"]')];
    return els.slice(0, 30).map(e => `<${e.tagName} class="${e.className}"> ${e.textContent.trim().slice(0,60)}`);
  });
  struct.forEach(s => log(`    ${s}`));

  log('  Manual action needed at: ' + VERSIONS_URL);
  process.exitCode = 1;
  return false;
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
