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

// Dynamically read App ID from app.json
const APP_JSON_PATH = path.join(__dirname, '..', '..', 'app.json');
let appJson = {};
try {
  appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
} catch (e) {
  console.error('Warning: could not read app.json:', e.message);
}
const APP_ID = appJson.id || 'com.dlnraja.tuya.zigbee';

const BASE = 'https://tools.developer.homey.app';
const VERSIONS_URL = `${BASE}/apps/app/${APP_ID}/versions`;
const EMAIL = process.env.HOMEY_EMAIL;
const PASSWORD = process.env.HOMEY_PASSWORD;
const DRY = process.env.DRY_RUN === 'true';
const SUM = process.env.GITHUB_STEP_SUMMARY || null;

function log(m) { console.log(m); if (SUM) try { fs.appendFileSync(SUM, m+'\n'); } catch {} }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitReady(page, label, ms = 6000) {
  await sleep(ms);
  try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10000 }); } catch {}
  const len = await page.evaluate(() => document.body?.innerText?.length || 0);
  log('  [wait] ' + label + ': ready (' + len + ' chars)');
}

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

  // List of apps to promote — main app first, then stable variant
  // APPS_TO_PROMOTE env var can override (comma-separated)
  const appsRaw = process.env.APPS_TO_PROMOTE || `${APP_ID},com.dlnraja.tuya.zigbee.stable`;
  const APPS = appsRaw.split(',').map(s => s.trim()).filter(Boolean);
  log(`Apps to promote: ${APPS.join(', ')}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Auto-accept browser confirmation dialogs
    page.on('dialog', async (dialog) => {
      log('  [DIALOG] ' + dialog.type() + ': ' + dialog.message());
      await dialog.accept();
    });

    // Intercept network to capture OAuth token
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

    // Step 1: Login once, then promote all apps
    log('\n### Step 1: Navigate to home');
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await waitReady(page, 'home-page', 5000);
    await snap(page, '01-initial');
    log(`  URL: ${page.url()}`);

    // Step 2: Login
    log('\n### Step 2: Check login');
    const url = page.url();
    const pageText = await page.evaluate(() => document.body?.innerText || '');
    const hasLoginBtn = pageText.includes('LOG IN') || pageText.includes('Log in') || pageText.includes('Sign in');
    const isOnAuth = url.includes('accounts.athom.com') || url.includes('login') || url.includes('auth');
    log(`  URL-redirect: ${isOnAuth} | In-page LOG IN btn: ${hasLoginBtn}`);

    if (isOnAuth || hasLoginBtn) {
      log('  Login required');
      if (hasLoginBtn && !isOnAuth) {
        log('  Clicking LOG IN button in sidebar...');
        const clicked = await page.evaluate(() => {
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
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await waitReady(page, 'after-login-click', 4000);
        await snap(page, '02-after-login-click');
        log(`  Now at: ${page.url()}`);
      }
      await doLogin(page);
      await waitReady(page, 'post-login', 5000);
      await snap(page, '04-post-login');
      log(`  Post-login URL: ${page.url()}`);
      if (page.url().includes('accounts.athom.com')) {
        const t = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
        if (/two.?factor|2fa|verification code/i.test(t)) {
          log('  2FA detected - cannot automate'); process.exitCode = 1; return;
        }
        if (/incorrect|invalid|wrong/i.test(t)) {
          log('  Login failed - bad credentials'); process.exitCode = 1; return;
        }
        await new Promise(r => setTimeout(r, 5000));
      }
      if (!page.url().includes('tools.developer.homey.app')) {
        await page.goto(BASE, { waitUntil: 'networkidle2' });
        await waitReady(page, 'home-after-login', 5000);
      }
    } else {
      log('  Already logged in');
    }

    await waitReady(page, 'pre-navigate', 3000);

    // === SPA warm-up: ALWAYS navigate to /apps to initialize React Router and auth state ===
    // CRITICAL FIX 2026-05-30: Removed conditional — must ALWAYS hard goto /apps
    // Without this, /versions page loads with blank main area (59KB screenshot bug)
    log('\n### Step 2.5: SPA warm-up — hard goto My Apps (always)');
    const myAppsUrl = `${BASE}/apps`;
    await page.goto(myAppsUrl, { waitUntil: 'networkidle2' });
    await waitReady(page, 'my-apps-warmup', 4000);
    const myAppsText = await page.evaluate(() => document.body?.innerText || '');
    log(`  My Apps loaded: ${myAppsText.length}c — has apps: ${myAppsText.toLowerCase().includes('tuya')}`);
    await snap(page, '04b-my-apps');

    const envBuildId = process.env.BUILD_ID || '';
    let anySuccess = false;

    for (let i = 0; i < APPS.length; i++) {
      const appId = APPS[i];
      const isMainApp = appId === APP_ID;
      const buildId = isMainApp ? envBuildId : ''; // only use BUILD_ID for main app
      log(`\n### Step 3.${i+1}: Promote ${appId}${buildId ? ' (BUILD_ID='+buildId+')' : ''}`);
      const result = await findAndPromote(page, captured, appId, buildId, i);
      if (result) {
        log(`### Result: ${appId} — Draft promoted to Test`);
        anySuccess = true;
      } else {
        log(`### Result: ${appId} — FAILED to promote`);
      }
    }

    await snap(page, '07-final');
    if (anySuccess) {
      log('\n### Overall: at least one app promoted successfully');
      log(`Manage: ${BASE}/apps/app/${APP_ID}`);
    } else {
      log('\n### Overall: NO apps were promoted');
      log('Manual: ' + BASE + '/apps/app/' + APP_ID + '/versions');
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
  await waitReady(page, 'login-page-render', 5000);

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
    await waitReady(page, 'after-email-submit', 5000);
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
  await waitReady(page, 'post-login-redirect', 5000);

  // Sometimes there's a second redirect (OAuth callback)
  if (page.url().includes('accounts.athom.com')) {
    log('  Still on accounts page, waiting for callback...');
    try {
      await page.waitForNavigation({waitUntil:'networkidle2',timeout:15000});
    } catch {}
    await waitReady(page, 'oauth-callback', 4000);
  }
  log('  Final login URL: ' + page.url());
}

async function spaNavigate(page, targetUrl, label, timeoutMs = 20000) {
  // Strategy A: SPA-internal navigation via clicking <a href> that matches target
  const clicked = await page.evaluate((url) => {
    const anchors = [...document.querySelectorAll('a[href]')];
    const match = anchors.find(a => {
      const href = a.getAttribute('href') || '';
      // exact path match (href can be relative like /apps/app/xxx/versions)
      return url.endsWith(href) || href === url || url.includes(href) && href.length > 5;
    });
    if (match) { match.click(); return match.getAttribute('href'); }
    return null;
  }, targetUrl);

  if (clicked) {
    try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: timeoutMs }); } catch {}
  } else {
    // Strategy B: pushState then dispatch popstate to trigger React Router
    await page.evaluate((url) => {
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }, targetUrl);
    await sleep(3000);
    try { await page.waitForNetworkIdle({ idleTime: 1000, timeout: 8000 }); } catch {}
  }

  // Verify the SPA rendered content
  await sleep(2000);
  const len = await page.evaluate(() => document.body?.innerText?.length || 0);
  log(`  [spa-nav ${label}] content: ${len}c, url: ${page.url()}`);
  return len;
}

async function findAndPromote(page, captured, appId, buildId, idx) {
  const snapPfx = `app${idx}`;
  const appUrl = `${BASE}/apps/app/${appId}`;
  const versionsUrl = `${appUrl}/versions`;

  // === SPA warm-up strategy ===
  // The Athom Dev Tools is a React SPA. Navigating cold to a deep URL leaves <main> blank.
  // Fix: always go through /apps first (warm-up), then use React Router navigation.
  const myAppsUrl = `${BASE}/apps`;

  // Step A: Warm up SPA via /apps (already authenticated at this point)
  const currentUrl = page.url();
  const alreadyOnApps = currentUrl.includes('/apps');
  if (!alreadyOnApps) {
    log(`  SPA warm-up: navigating to /apps...`);
    const warmLen = await spaNavigate(page, myAppsUrl, 'warmup-apps');
    await snap(page, `05-${snapPfx}-warmup`);
    if (warmLen < 200) {
      // Hard reload to /apps as last resort
      await page.goto(myAppsUrl, { waitUntil: 'networkidle2' });
      await waitReady(page, `${snapPfx}-apps-reload`, 8000);
    }
  }

  // Step B: Navigate within the warm SPA to the specific app page
  log(`  SPA navigate to app versions: ${versionsUrl}`);
  let contentLen = await spaNavigate(page, versionsUrl, `${snapPfx}-versions`);
  await snap(page, `05-${snapPfx}-versions`);

  // Step C: If SPA navigate didn't work, try clicking the correct app link in My Apps list
  if (contentLen < 400) {
    log(`  SPA nav gave ${contentLen}c — trying to click app card for ${appId}...`);
    // Navigate back to /apps to find the app card
    await spaNavigate(page, myAppsUrl, `${snapPfx}-back-to-apps`);
    await sleep(3000);

    const clicked = await page.evaluate((id) => {
      // Find link whose href EXACTLY contains /apps/app/<id> but NOT /apps/app/<id>.stable etc.
      const anchors = [...document.querySelectorAll('a[href*="/apps/app/"]')];
      const exact = anchors.find(a => {
        const href = a.getAttribute('href') || '';
        // Must match /apps/app/<id> exactly — avoid partial matches like com.dlnraja.tuya.zigbee.stable
        const seg = href.split('?')[0].split('#')[0];
        return seg === `/apps/app/${id}` || seg === `/apps/app/${id}/` || seg.endsWith(`/${id}`);
      });
      if (exact) { exact.click(); return `clicked: ${exact.getAttribute('href')}`; }
      return null;
    }, appId);

    log(`  App card click: ${clicked || 'not found'}`);
    await sleep(3000);
    try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10000 }); } catch {}

    // Now navigate to /versions via SPA
    contentLen = await spaNavigate(page, versionsUrl, `${snapPfx}-versions-after-card`);
    await snap(page, `05-${snapPfx}-versions2`);
  }

  // Try session API with captured token — use per-app appId
  if (captured.token) log('  Token: captured');
  let text = await page.evaluate(() => document.body?.innerText || '');
  log('  Page: ' + text.length + 'c, URL: ' + page.url());
  // Pass appId to promote-via-session via env override
  const savedApp = process.env.PROMOTE_APP_ID;
  process.env.PROMOTE_APP_ID = appId;
  try {
    const apiRes = await promoteViaBrowserSession(page, log, DRY, captured?.token);
    if (apiRes === true) return true;
    log('  Session API: ' + (apiRes || 'no result') + ', falling back to SPA polling...');
  } catch (e) { log('  Session API error: ' + e.message); }
  finally { if (savedApp !== undefined) process.env.PROMOTE_APP_ID = savedApp; else delete process.env.PROMOTE_APP_ID; }

  let hasDraft = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2000);
    text = await page.evaluate(() => document.body?.innerText || '');
    hasDraft = text.toLowerCase().includes('draft');
    const hasVersion = /\d+\.\d+\.\d+/.test(text);
    const hasContent = text.length > 400;
    log(`  Poll ${attempt+1}/10: ${text.length}c, hasVersion=${hasVersion}, hasDraft=${hasDraft}`);
    if (hasContent && (hasVersion || hasDraft)) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // Log page content snippet for debugging
  const snippet = text.replace(/\s+/g, ' ').substring(0, 500);
  log(`  Page snippet: "${snippet}"`);

  if (!hasDraft) {
    const hasTest = text.toLowerCase().includes('test');
    const hasLive = text.toLowerCase().includes('live');
    if (hasTest || hasLive) {
      log('  Page loaded but no draft builds (has test/live). Already promoted or no new build?');
    } else {
      log('  No draft builds found — SPA still not hydrated or no draft exists');
    }
    // Dump HTML for debugging
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    log(`  HTML length: ${html.length}`);
    const dDir = process.env.GITHUB_WORKSPACE
      ? path.join(process.env.GITHUB_WORKSPACE, 'screenshots')
      : path.join(__dirname, '..', '..', 'screenshots');
    fs.mkdirSync(dDir, { recursive: true });
    fs.writeFileSync(path.join(dDir, `page-dump-${appId.replace(/\./g,'-')}.html`), html);
    log(`  Saved page-dump-${appId}.html for analysis`);
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
    await waitReady(page, 'submission-page', 12000);
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
      await waitReady(page, 'after-publish-click', 5000);
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
      await waitReady(page, 'after-modal-confirm', 6000);
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
    await waitReady(page, 'after-row-click', 6000);
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
      await waitReady(page, 'strategy2-after-btn', 5000);
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
      await waitReady(page, 'strategy2-modal-confirm', 6000);
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
