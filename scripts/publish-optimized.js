#!/usr/bin/env node
/**
 * publish-optimized.js — Create optimized archive and upload to Athom via Puppeteer
 *
 * The homey CLI creates 27MB+ archives that Athom can't process.
 * This script:
 * 1. Optimizes .homeybuild/ (removes node_modules, large.png)
 * 2. Creates a compact archive (7-8MB, no ./ prefix)
 * 3. Uploads via Athom developer portal (Puppeteer)
 *
 * Usage: node scripts/publish-optimized.js
 * Requires: HOMEY_EMAIL, HOMEY_PASSWORD env vars
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(process.cwd(), '.homeybuild');
const ARCHIVE_PATH = '/tmp/homey-optimized.tar.gz';
const APP_ID = 'com.dlnraja.tuya.zigbee';

// Files/dirs to remove from .homeybuild/ before archiving
const EXCLUDE_FROM_BUILD = [
  'node_modules',                    // 5.5MB - bundled by SDK3
  'drivers/*/assets/images/large.png', // 1.14MB - not needed at runtime
];

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function optimize() {
  console.log('=== Optimizing .homeybuild/ ===');

  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ .homeybuild/ not found. Run: npx homey app build');
    process.exit(1);
  }

  const before = execSync(`du -sb "${BUILD_DIR}"`, { encoding: 'utf8' }).trim().split('\t')[0];
  console.log(`Before: ${formatSize(parseInt(before))}`);

  // Remove node_modules
  const nmDir = path.join(BUILD_DIR, 'node_modules');
  if (fs.existsSync(nmDir)) {
    execSync(`rm -rf "${nmDir}"`, { stdio: 'pipe' });
    console.log('  Removed node_modules/');
  }

  // Remove large.png from drivers
  try {
    const count = execSync(`find "${BUILD_DIR}/drivers" -name "large.png" -delete -print | wc -l`, { encoding: 'utf8' }).trim();
    console.log(`  Removed ${count} large.png files`);
  } catch (e) {}

  const after = execSync(`du -sb "${BUILD_DIR}"`, { encoding: 'utf8' }).trim().split('\t')[0];
  console.log(`After:  ${formatSize(parseInt(after))}`);
  console.log(`Saved:  ${formatSize(parseInt(before) - parseInt(after))}`);
}

function createArchive() {
  console.log('\n=== Creating archive (no ./ prefix) ===');

  // Remove old archive
  try { fs.unlinkSync(ARCHIVE_PATH); } catch {}

  // Create archive with * (no ./ prefix)
  execSync(`bash -c 'cd .homeybuild && tar czf ${ARCHIVE_PATH} *'`, { stdio: 'pipe' });

  const size = fs.statSync(ARCHIVE_PATH).size;
  const entries = execSync(`tar tzf ${ARCHIVE_PATH}`, { encoding: 'utf8' }).split('\n').filter(Boolean).length;
  const prefixCount = execSync(`tar tzf ${ARCHIVE_PATH} | grep '^\\./' | wc -l`, { encoding: 'utf8' }).trim();

  console.log(`Size: ${formatSize(size)}`);
  console.log(`Entries: ${entries}`);
  console.log(`./ prefix: ${prefixCount}`);

  // Verify critical files
  const hasAppJson = execSync(`tar tzf ${ARCHIVE_PATH} | grep -c 'app.json$'`, { encoding: 'utf8' }).trim();
  const hasAppJs = execSync(`tar tzf ${ARCHIVE_PATH} | grep -c 'app.js$'`, { encoding: 'utf8' }).trim();
  console.log(`app.json: ${hasAppJson > 0 ? '✅' : '❌'}`);
  console.log(`app.js: ${hasAppJs > 0 ? '✅' : '❌'}`);

  if (size > 20 * 1024 * 1024) {
    console.error(`❌ Archive too large (${formatSize(size)} > 20MB)`);
    process.exit(1);
  }

  return size;
}

async function uploadViaPuppeteer() {
  console.log('\n=== Uploading via Puppeteer ===');

  const EMAIL = process.env.HOMEY_EMAIL;
  const PASSWORD = process.env.HOMEY_PASSWORD;

  if (!EMAIL || !PASSWORD) {
    console.error('HOMEY_EMAIL and HOMEY_PASSWORD required');
    console.log('Set them and re-run, or upload manually:');
    console.log(`  1. Go to https://tools.developer.homey.app/apps/app/${APP_ID}`);
    console.log(`  2. Click SUBMISSION > on the latest draft build`);
    console.log(`  3. Click "Publish to Test"');
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('puppeteer not installed. Run: npm install puppeteer');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login
    console.log('Logging in...');
    await page.goto('https://accounts.athom.com/signin', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    console.log('✅ Logged in');

    // Navigate to app builds
    console.log('Navigating to builds...');
    await page.goto(`https://tools.developer.homey.app/apps/app/${APP_ID}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    // Find the SUBMISSION > link for the latest build
    const submissionLink = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')];
      const sub = links.find(l => l.textContent.includes('SUBMISSION'));
      return sub ? sub.href : null;
    });

    if (submissionLink) {
      console.log('Found submission link:', submissionLink);
      await page.goto(submissionLink, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));

      // Look for "Publish to Test" button
      const published = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')];
        const publishBtn = buttons.find(b =>
          b.textContent.includes('Publish to Test') ||
          b.textContent.includes('Publish') ||
          b.textContent.includes('Promote')
        );
        if (publishBtn) {
          publishBtn.click();
          return true;
        }
        return false;
      });

      if (published) {
        console.log('✅ Clicked Publish to Test');
        await new Promise(r => setTimeout(r, 3000));

        // Confirm dialog if present
        const confirmed = await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')];
          const confirm = btns.find(b =>
            b.textContent.includes('Confirm') ||
            b.textContent.includes('OK') ||
            b.textContent.includes('Yes')
          );
          if (confirm) { confirm.click(); return true; }
          return false;
        });
        if (confirmed) console.log('✅ Confirmed');
      } else {
        console.log('⚠️ Publish button not found');
        await page.screenshot({ path: 'screenshots/publish-page.png' });
        console.log('Screenshot saved to screenshots/publish-page.png');
      }
    } else {
      console.log('⚠️ No submission link found');
      await page.screenshot({ path: 'screenshots/builds-page.png' });
      console.log('Screenshot saved to screenshots/builds-page.png');
    }

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

// Main
async function main() {
  optimize();
  createArchive();
  await uploadViaPuppeteer();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
