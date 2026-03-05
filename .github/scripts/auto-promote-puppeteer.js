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
const BASE = 'https://tools.developer.homey.app';
const VERSIONS_URL = `${BASE}/apps/app/${APP_ID}/versions`;
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
    process.exit(1);
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

    // Auto-accept browser confirmation dialogs (e.g. "Are you sure you want to publish?")
    page.on('dialog', async (dialog) => {
      log('  [DIALOG] ' + dialog.type() + ': ' + dialog.message());
      await dialog.accept();
    });

    // Intercept network to capture OAuth token from both requests and responses
    const captured = { token: null, apiUrls: [], reqHeaders: {} };
    page.on('request', (req) => {
      try {
        const u = req.url();
        const auth = req.headers()['authorization'] || '';
        if (auth && u.includes('apps-api')) {
          captured.token = auth.replace(/^Bearer\s+/i, '');
          captured.reqHeaders = req.headers();
          log('  [NET] Auth header captured from request to: ' + u.split('?')[0]);
        }
        if (u.includes('apps-api') || u.includes('/api/')) captured.apiUrls.push(u);
      } catch {}
    });
    page.on('response', async (res) => {
      try {
        const u = res.url();
        if (u.includes('/oauth2/token') || u.includes('/oauth/token')) {
          const j = await res.json().catch(() => null);
          if (j?.access_token && !captured.token) { captured.token = j.access_token; log('  [NET] OAuth token from response'); }
        }
      } catch {}
    });

    // Step 1: Go to HOME page (not deep URL — SPA needs step-by-step navigation)
    log('\n### Step 1: Navigate to home');
    await page.goto(BASE, { waitUntil: 'networkidle2' });
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

      // Go to home so SPA hydrates properly
      if (!page.url().includes('tools.developer.homey.app')) {
        await page.goto(BASE, { waitUntil: 'networkidle2' });
      }
    } else {
      log('  Already logged in');
    }

    await new Promise(r => setTimeout(r, 2000));
    log(`  Current URL: ${page.url()}`);

    // Step 3: Find and promote (includes SPA navigation)
    log('\n### Step 3: Find draft & promote');
    const result = await findAndPromote(page, captured);
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

async function findAndPromote(page, captured) {
  // Navigate via SPA clicks: My Apps -> App -> Versions
  await spaNav(page);
  async function spaNav(p) {
    log('  3a: My Apps');
    await p.evaluate(()=>{const l=document.querySelector('a[href="/apps"]');if(l)l.click();});
    await new Promise(r=>setTimeout(r,4000));
    await snap(p,'05a-apps');
    log('  3b: App');
    const ok=await p.evaluate(id=>{const a=[...document.querySelectorAll('a')].find(l=>l.href&&l.href.includes(id));if(a){a.click();return true;}return false;},APP_ID);
    if(!ok) await p.goto(BASE+'/apps/app/'+APP_ID,{waitUntil:'networkidle2'});
    await new Promise(r=>setTimeout(r,4000));
    await snap(p,'05b-app');
    log('  3c: Versions');
    await p.evaluate(()=>{const a=[...document.querySelectorAll('a,button,[role="tab"]')].find(e=>/version/i.test(e.textContent));if(a)a.click();});
    await new Promise(r=>setTimeout(r,4000));
    await snap(p,'05c-ver');
  }

  // Try session API with captured token
  if (captured.token) log('  Token: captured');
  let text = await page.evaluate(() => document.body?.innerText || '');
  log('  Page: ' + text.length + 'c, URL: ' + page.url());
  try {
    const apiRes = await promoteViaBrowserSession(page, log, DRY, captured?.token);
    if (apiRes === true) return true;
    log('  Session API: ' + (apiRes || 'no result') + ', falling back to SPA polling...');
  } catch (e) { log('  Session API error: ' + e.message); }

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
    // Fallback: try direct deep-link to versions page
    log('  SPA nav didn\'t find drafts, trying deep-link to versions...');
    await page.goto(VERSIONS_URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));
    text = await page.evaluate(() => document.body?.innerText || '');
    hasDraft = text.toLowerCase().includes('draft');
    log('  Deep-link: ' + text.length + 'c, hasDraft=' + hasDraft);
    await snap(page, '05d-deeplink');
  }

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

  // Strategy 1: Click "SUBMISSION >" link next to first draft build row
  log('  Strategy 1: Find SUBMISSION link for draft');
  const clicked = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr')];
    for (const row of rows) {
      if (!/draft/i.test(row.textContent)) continue;
      const link = row.querySelector('a');
      if (link && /submission/i.test(link.textContent)) {
        link.click();
        return 'SUBMISSION link in draft row: ' + link.href;
      }
      const anyLink = [...row.querySelectorAll('a')].find(a => a.href);
      if (anyLink) { anyLink.click(); return 'Link in draft row: ' + anyLink.href; }
    }
    // Fallback: any "release to test" or "promote" button
    const btns = [...document.querySelectorAll('button, a, [role="button"]')];
    for (const b of btns) {
      const t = (b.textContent || '').trim().toLowerCase();
      if (t.includes('release to test') || t.includes('promote to test')) {
        b.click(); return 'Button: ' + b.textContent.trim();
      }
    }
    return null;
  });

  if (clicked) {
    log(`  ${clicked}`);
    await new Promise(r => setTimeout(r, 10000));
    await snap(page, '06-after-click');

    // On submission page: dump info for debugging
    log('  Submission page: ' + page.url());
    const subHtml = await page.evaluate(() => document.documentElement.outerHTML);
    log('  Sub page: ' + subHtml.length + 'c');
    const sDir = process.env.GITHUB_WORKSPACE
      ? path.join(process.env.GITHUB_WORKSPACE, 'screenshots')
      : path.join(__dirname, '..', '..', 'screenshots');
    fs.mkdirSync(sDir, { recursive: true });
    fs.writeFileSync(path.join(sDir, 'submission-dump.html'), subHtml);
    const elList = await page.evaluate(() => {
      return [...document.querySelectorAll('button,a,[role="button"],[role="tab"],select')].slice(0,40)
        .map(e => `<${e.tagName} role=${e.getAttribute('role')} class="${(e.className||'').toString().slice(0,40)}"> ${(e.textContent||'').trim().slice(0,50)}`);
    });
    elList.forEach(s => log('    EL: ' + s));
    await snap(page, '06b-submission');

    // Look for "Publish to Test" button (the actual Homey dev tools button)
    const promoted = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a, [role="button"]')];
      const keywords = ['publish to test', 'release to test', 'promote to test'];
      for (const b of btns) {
        const t = (b.textContent || '').trim().toLowerCase();
        for (const kw of keywords) {
          if (t.includes(kw)) { b.click(); return 'Clicked: ' + b.textContent.trim(); }
        }
      }
      return null;
    });
    if (promoted) {
      log('  ' + promoted);
      await new Promise(r => setTimeout(r, 2000));
      // Handle MUI confirmation modal
      const ok = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"],.MuiDialog-root');
        if (!dlg) return null;
        for (const b of dlg.querySelectorAll('button')) {
          const t = (b.textContent||'').trim().toLowerCase();
          if (['ok','yes','confirm','publish','accept'].some(k=>t.includes(k))) { b.click(); return t; }
        }
        const pri = dlg.querySelector('.MuiButton-containedPrimary');
        if (pri) { pri.click(); return 'primary'; }
        return null;
      });
      if (ok) log('  Confirmed modal: ' + ok);
      await new Promise(r => setTimeout(r, 3000));
      await snap(page, '06c-after-promote');
      return true;
    }
    log('  SUBMISSION page loaded but "Publish to Test" button not found');
    await snap(page, '06c-no-promote-btn');
    // Fall through to strategy 2
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
      const keywords = ['publish to test', 'release to test', 'promote to test', 'publish to testing'];
      for (const b of btns) {
        const t = (b.textContent || '').trim().toLowerCase();
        for (const kw of keywords) {
          if (t.includes(kw)) { b.click(); return `Clicked: "${b.textContent.trim()}"`; }
        }
      }
      // Fallback: MUI primary contained button (Athom uses Material UI)
      for (const b of btns) {
        const cls = (b.className || '').toString();
        if (cls.includes('MuiButton-containedPrimary')) {
          b.click(); return `Clicked MUI primary: "${(b.textContent||'').trim()}"`;
        }
      }
      return null;
    });
    if (btn2) {
      log(`  ${btn2}`);
      await new Promise(r => setTimeout(r, 2000));
      // Handle MUI confirmation modal
      const ok2 = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"],.MuiDialog-root');
        if (!dlg) return null;
        for (const b of dlg.querySelectorAll('button')) {
          const t = (b.textContent||'').trim().toLowerCase();
          if (['ok','yes','confirm','publish','accept'].some(k=>t.includes(k))) { b.click(); return t; }
        }
        const pri = dlg.querySelector('.MuiButton-containedPrimary');
        if (pri) { pri.click(); return 'primary'; }
        return null;
      });
      if (ok2) log('  Confirmed modal: ' + ok2);
      await new Promise(r => setTimeout(r, 3000));
      await snap(page, '06e-strategy2-done');
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
