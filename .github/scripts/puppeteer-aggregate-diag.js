#!/usr/bin/env node
/**
 * puppeteer-aggregate-diag.js
 * Diagnostic Puppeteer pour :
 * 1. Portail Homey Dev → statut de l'app / AggregateErrors
 * 2. Statut de publication (draft/test/live)
 * 3. API Athom directe pour les erreurs de build
 */
'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const APP_ID = 'com.dlnraja.tuya.zigbee';
const PORTAL_URL = 'https://tools.developer.homey.app';
const APP_URL = `${PORTAL_URL}/tools/app?appId=${APP_ID}`;
const API_BASE = 'https://api.athom.com';

// Lire le token Homey CLI
function getHomeyToken() {
  const settingsPath = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    // Chercher le token dans différentes structures
    if (s.token) return s.token;
    if (s._token) return s._token;
    if (s.accessToken) return s.accessToken;
    if (s.homeyApi && s.homeyApi.token) return s.homeyApi.token;
    if (s.tokens) return Object.values(s.tokens)[0];
    return null;
  } catch (e) {
    return null;
  }
}

// Lire le HOMEY_PAT depuis .env ou env
function getHomeyPAT() {
  const envFile = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^HOMEY_PAT=(.+)$/);
      if (m) return m[1].trim();
    }
  }
  return process.env.HOMEY_PAT || null;
}

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('PUPPETEER AGGREGATE ERROR DIAGNOSTIC');
  console.log('App:', APP_ID);
  console.log('='.repeat(60));

  const token = getHomeyToken();
  const pat = getHomeyPAT();
  console.log('Homey CLI Token:', token ? `found (${token.slice(0,12)}...)` : 'NOT FOUND');
  console.log('HOMEY_PAT:', pat ? `found (${pat.slice(0,8)}...)` : 'NOT FOUND');
  console.log('');

  // === PHASE 1: API Athom directe (sans browser) ===
  console.log('--- PHASE 1: Athom API Direct ---');
  if (pat || token) {
    const authToken = pat || token;
    try {
      const https = require('https');
      const apiCheck = (url, authHdr) => new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.athom.com',
          path: url,
          headers: { 'Authorization': authHdr, 'Content-Type': 'application/json' }
        };
        https.get(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
      });

      // Tenter l'API apps
      const r = await apiCheck(`/app/${APP_ID}`, `Bearer ${authToken}`);
      console.log(`API /app/${APP_ID}: HTTP ${r.status}`);
      if (r.status === 200) {
        const d = JSON.parse(r.body);
        console.log('App status:', d.status || d.state || 'unknown');
        console.log('Version:', d.version || 'unknown');
        console.log('Live:', d.isLive || false);
        if (d.error) console.log('ERROR:', d.error);
      } else {
        console.log('Body preview:', r.body.slice(0, 200));
      }
    } catch (e) {
      console.log('API call failed:', e.message);
    }
  } else {
    console.log('No auth token available - skipping API check');
  }

  // === PHASE 2: Puppeteer sur le portail dev ===
  console.log('');
  console.log('--- PHASE 2: Puppeteer Dev Portal ---');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Intercepter les réponses API
    const apiResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api.athom.com') || url.includes('api.homey.app')) {
        try {
          const body = await response.text();
          apiResponses.push({ url, status: response.status(), body: body.slice(0, 500) });
        } catch (e) {}
      }
    });

    console.log('Opening:', APP_URL);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Screenshot
    const screenshotPath = path.join(__dirname, '../../scripts/validate/diag-portal-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot saved:', screenshotPath);

    // Extraire le texte de la page
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('');
    console.log('Page content (first 800 chars):');
    console.log(pageText.slice(0, 800));

    // Chercher les erreurs dans la page
    const errors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll('[class*="error"], [class*="Error"], [data-status="error"]');
      return Array.from(errorEls).map(el => el.innerText).filter(t => t.trim());
    });

    if (errors.length > 0) {
      console.log('');
      console.log('Errors found on page:');
      errors.forEach(e => console.log(' -', e.slice(0, 200)));
    }

    // Chercher les données d'AggregateError spécifiquement
    const aggregateInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      const hasAggregate = body.toLowerCase().includes('aggregate') || body.includes('AggregateError');
      const hasProcessingFailed = body.toLowerCase().includes('processing_failed') || body.toLowerCase().includes('processing failed');
      const hasPublished = body.toLowerCase().includes('published') || body.toLowerCase().includes('live');
      const hasDraft = body.toLowerCase().includes('draft');
      const hasTest = body.toLowerCase().includes('test');
      return { hasAggregate, hasProcessingFailed, hasPublished, hasDraft, hasTest };
    });

    console.log('');
    console.log('Page indicators:', JSON.stringify(aggregateInfo, null, 2));

    // Afficher les réponses API interceptées
    if (apiResponses.length > 0) {
      console.log('');
      console.log('API calls intercepted:');
      apiResponses.forEach(r => {
        console.log(`  [${r.status}] ${r.url}`);
        if (r.body) console.log(`    Body: ${r.body.slice(0, 150)}`);
      });
    }

  } catch (e) {
    console.log('Puppeteer error:', e.message);
  } finally {
    if (browser) await browser.close();
  }

  // === PHASE 3: Check local AggregateErrors ===
  console.log('');
  console.log('--- PHASE 3: Local AggregateError Scan ---');

  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    let aggregateErrors = [];

    appJson.drivers.forEach(driver => {
      // AggregateError = driver Zigbee sans manufacturerName valide dans ses fingerprints
      if (!driver.zigbee) return; // WiFi/Virtual ok
      const fps = driver.zigbee;
      if (!fps.manufacturerName || fps.manufacturerName.length === 0) {
        aggregateErrors.push({
          driver: driver.id,
          issue: 'missing manufacturerName in zigbee config'
        });
      }
      // Vérifier productId / modelId
      if (!fps.productId && !fps.modelId) {
        // Check si c'est un generic fallback
        if (driver.id.includes('generic') || driver.id.includes('virtual')) return;
        aggregateErrors.push({
          driver: driver.id,
          issue: 'missing productId AND modelId'
        });
      }
    });

    console.log('Total Zigbee drivers:', appJson.drivers.filter(d => d.zigbee).length);
    console.log('Potential AggregateError drivers:', aggregateErrors.length);
    if (aggregateErrors.length > 0) {
      console.log('First 10:');
      aggregateErrors.slice(0, 10).forEach(e => console.log(`  ${e.driver}: ${e.issue}`));
    } else {
      console.log('✅ No AggregateError risk detected in app.json');
    }
  } catch (e) {
    console.log('Local scan error:', e.message);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));
}

runDiagnostics().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
