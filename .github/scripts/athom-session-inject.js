#!/usr/bin/env node
/**
 * athom-session-inject.js
 * 
 * Injects the Athom CLI OAuth session into Puppeteer (no email/password needed).
 * Reads from %APPDATA%/athom-cli/settings.json (where `homey app publish` stores its session).
 * 
 * This allows Puppeteer scripts to run authenticated WITHOUT HOMEY_EMAIL/HOMEY_PASSWORD.
 * 
 * Usage:
 *   const { launchWithSession } = require('./athom-session-inject');
 *   const { browser, page, token } = await launchWithSession();
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

const SETTINGS_PATH = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
const BASE = 'https://tools.developer.homey.app';
const API_BASE = 'https://apps-api.athom.com';

// ===================================================================
// Read CLI session
// ===================================================================
function readCliSession() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    throw new Error(`CLI settings not found at ${SETTINGS_PATH}. Run: homey login`);
  }
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  const api = settings.homeyApi || {};
  
  // Get OAuth token
  const token = api.token;
  if (!token?.access_token) throw new Error('No access_token in CLI session. Run: homey login');
  
  return {
    access_token:  token.access_token,
    refresh_token: token.refresh_token,
    token_type:    token.token_type || 'Bearer',
    expires_in:    token.expires_in,
    rawToken:      token,
  };
}

// ===================================================================
// Get delegation token for apps-api.athom.com (audience: apps)
// CLI token has audience: api — we need to get a delegation for apps
// ===================================================================
async function getDelegationToken(accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ audience: 'apps' });
    const opts = {
      hostname: 'api.athom.com',
      path: '/delegation/token',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 200) {
          // Returns JWT string directly or {token: '...'}
          try {
            const json = JSON.parse(raw);
            resolve(json.token || json.access_token || json);
          } catch {
            resolve(raw.trim().replace(/^"|"$/g, '')); // bare JWT string
          }
        } else {
          console.log(`Delegation HTTP ${res.statusCode}: ${raw.slice(0,200)}`);
          resolve(null); // Fall back to direct token
        }
      });
    });
    req.on('error', e => { console.log('Delegation error:', e.message); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ===================================================================
// Fetch JSON from Athom API with token
// ===================================================================
async function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'apps-api.athom.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        } else {
          resolve({ _error: res.statusCode, _body: raw.slice(0,200) });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ===================================================================
// Launch Puppeteer with CLI session injected via localStorage
// ===================================================================
async function launchWithSession(opts = {}) {
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch {
    throw new Error('puppeteer not installed. Run: npm install puppeteer --no-save');
  }

  const session = readCliSession();
  console.log('[SESSION] CLI token loaded (expires_in:', session.expires_in, ')');
  
  // Get delegation token for apps-api using Athom CLI helper
  let delegationToken = null;
  try {
    const homeyRoot = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
    const AthomApi = require(path.join(homeyRoot, 'services', 'AthomApi'));
    delegationToken = await AthomApi.createDelegationToken({ audience: 'apps' });
  } catch (e) {
    console.log('[SESSION] AthomApi delegation error:', e.message);
  }
  const effectiveToken  = delegationToken || session.access_token;
  console.log('[SESSION] Delegation token:', delegationToken ? 'obtained ✓' : 'failed, using CLI token');

  const browser = await puppeteer.launch({
    headless: opts.headless !== false ? 'new' : false,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 1024 },
    ...opts.launchOptions,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  // Navigate first to set cookies/localStorage in correct domain context without redirecting
  await page.setRequestInterception(true);
  const tempHandler = req => {
    try {
      const url = req.url();
      if (url === BASE || url === BASE + '/') {
        req.respond({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Injected</body></html>'
        });
      } else {
        req.continue();
      }
    } catch {
      try { req.continue(); } catch {}
    }
  };
  page.on('request', tempHandler);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
  
  // Inject CLI session into browser localStorage to bypass manual login
  await page.evaluate((tok, refreshTok) => {
    // Athom SPA uses localStorage for auth state
    const tokenData = {
      access_token: tok,
      token_type: 'Bearer',
      refresh_token: refreshTok,
    };
    // Try multiple storage keys that Athom SPA might use
    const keys = ['homeyApiToken', 'athomToken', 'token', '_token', 'access_token', '__athom_access_token'];
    for (const key of keys) {
      try { localStorage.setItem(key, tok); } catch {}
      try { localStorage.setItem(key + 'Data', JSON.stringify(tokenData)); } catch {}
    }
    try { localStorage.setItem('homey-api', JSON.stringify({ token: tokenData })); } catch {}
    // Also try sessionStorage
    try { sessionStorage.setItem('homeyApiToken', tok); } catch {}
    try { sessionStorage.setItem('homey-api', JSON.stringify({ token: tokenData })); } catch {}
    console.log('[INJECT] Session injected into browser storage');
  }, session.access_token, session.refresh_token);

  page.off('request', tempHandler);

  // Set Authorization header on all requests
  await page.setExtraHTTPHeaders({
    'Authorization': `Bearer ${effectiveToken}`,
  });

  // Intercept requests to add auth header
  page.on('request', req => {
    try {
      const url = req.url();
      const headers = { ...req.headers() };
      if (url.includes('athom.com') || url.includes('homey.app')) {
        headers['Authorization'] = headers['Authorization'] || `Bearer ${effectiveToken}`;
      }
      req.continue({ headers });
    } catch { try { req.continue(); } catch {} }
  });

  return { browser, page, token: effectiveToken, session };
}

// ===================================================================
// Get build details from API
// ===================================================================
async function getBuildDetails(appId, buildId, token) {
  const data = await apiGet(`/api/v1/app/${appId}/build/${buildId}`, token);
  return data;
}

// ===================================================================
// Get builds list from API
// ===================================================================
async function getBuilds(appId, token) {
  const data = await apiGet(`/api/v1/app/${appId}/build`, token);
  return data;
}

module.exports = { readCliSession, getDelegationToken, apiGet, launchWithSession, getBuildDetails, getBuilds };

// ===================================================================
// Direct run: fetch build details via API
// ===================================================================
if (require.main === module) {
  const APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8'));
  const APP_ID = APP_JSON.id || 'com.dlnraja.tuya.zigbee';
  
  const buildId = process.argv[2] || '2204';
  
  (async () => {
    try {
      console.log('[DIRECT] Reading CLI session...');
      const session = readCliSession();
      console.log('[DIRECT] Getting delegation token...');
      const delegToken = await getDelegationToken(session.access_token);
      const token = delegToken || session.access_token;
      
      console.log(`\n[DIRECT] Fetching build ${buildId} details...`);
      const build = await getBuildDetails(APP_ID, buildId, token);
      console.log('[BUILD DATA]:');
      console.log(JSON.stringify(build, null, 2).slice(0, 3000));
      
      console.log(`\n[DIRECT] Fetching all builds list...`);
      const builds = await getBuilds(APP_ID, token);
      if (Array.isArray(builds)) {
        builds.slice(0,5).forEach(b => {
          console.log(`  Build #${b.id || b.buildId}: v${b.version} status=${b.status || b.state} archiveUrl=${b.archiveUrl || b.url || 'N/A'}`);
        });
      } else {
        console.log(JSON.stringify(builds).slice(0,500));
      }
    } catch(e) {
      console.error('Error:', e.message);
    }
  })();
}
