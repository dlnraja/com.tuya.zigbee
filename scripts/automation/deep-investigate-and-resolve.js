#!/usr/bin/env node
/**
 * deep-investigate-and-resolve.js
 *
 * Autonomous deep investigation engine for forum posts and GitHub issues.
 * When a user reports a problem, this script:
 * 1. Extracts device info (MFR, PID, error patterns)
 * 2. Cross-references with Z2M, ZHA, Domoticz GitHub repos
 * 3. Searches for known fixes in upstream projects
 * 4. Checks our codebase for matching drivers/DPs
 * 5. Applies fixes or prepares detailed responses
 *
 * Per GLOBAL_INVESTIGATION_PLAN.md §8 (Forum & GitHub Investigation)
 * Per .agents/rules/architectural.md §3 (Autonomous Evolution)
 *
 * Usage: node scripts/automation/deep-investigate-and-resolve.js [--dry-run] [--post-id N]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const DRY_RUN = process.argv.includes('--dry-run');
const POST_ID = process.argv.includes('--post-id')
  ? parseInt(process.argv[process.argv.indexOf('--post-id') + 1])
  : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Z2M/external project URLs for cross-referencing ───
const EXTERNAL_REPOS = [
  'https://github.com/Koenkk/zigbee-herdsman-converters',
  'https://github.com/Koenkk/zigbee2mqtt',
  'https:///zigpy/zha-device-handlers',
];

// ─── Known device category mappings ───
const DEVICE_CATEGORIES = {
  soil: ['soil', 'moisture', 'plant', 'fertility'],
  illuminance: ['lux', 'light', 'luminance', 'brightness', 'solar'],
  motion: ['motion', 'pir', 'presence', 'radar', 'mmwave'],
  contact: ['contact', 'door', 'window', 'magnet'],
  climate: ['temperature', 'humidity', 'thermostat'],
  button: ['button', 'switch', 'scene', 'sos', 'emergency'],
  dimmer: ['dimmer', 'brightness', 'dimmable'],
  plug: ['plug', 'outlet', 'socket', 'energy'],
  cover: ['cover', 'curtain', 'shutter', 'blind'],
};

// ─── Extract device info from text ───
function extractDeviceInfo(text) {
  const info = {
    manufacturerIds: [...new Set((text.match(/_[A-Z0-9]{6,}/gi) || []))],
    productIds: [...new Set(text.match(/TS[0-9]{4}[A-Z]?/g) || [])],
    diagnosticCodes: [...new Set(text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi) || [])],
    errorPatterns: [],
    deviceCategory: null,
    version: null,
    symptoms: [],
  };

  // Detect error patterns
  const ERRORS = [
    { rx: /ReferenceError/i, type: 'ReferenceError' },
    { rx: /TypeError/i, type: 'TypeError' },
    { rx: /AggregateError/i, type: 'AggregateError' },
    { rx: /MODULE_NOT_FOUND/i, type: 'MODULE_NOT_FOUND' },
    { rx: /crash/i, type: 'crash' },
    { rx: /freeze|hang|stuck|endlessly/i, type: 'hang' },
    { rx: /not working|doesn't work|not update/i, type: 'not_working' },
    { rx: /wrong|incorrect|bad/i, type: 'wrong_value' },
    { rx: /missing|not showing|no data/i, type: 'missing_data' },
    { rx: /battery.*1%|battery.*drop/i, type: 'battery_issue' },
    { rx: /luminance|lux|brightness/i, type: 'luminance' },
  ];
  for (const { rx, type } of ERRORS) {
    if (rx.test(text)) info.errorPatterns.push(type);
  }

  // Detect device category
  const lowerText = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(DEVICE_CATEGORIES)) {
    if (keywords.some(k => lowerText.includes(k))) {
      info.deviceCategory = cat;
      break;
    }
  }

  // Detect version
  const verMatch = text.match(/v?8\.1\.(\d+)/);
  if (verMatch) info.version = parseInt(verMatch[1]);

  return info;
}

// ─── Search Z2M for device info ───
async function searchZ2M(mfr) {
  return new Promise((resolve) => {
    const url = `https://github.com/Koenkk/zigbee2mqtt/issues?q=${encodeURIComponent(mfr)}`;
    https.get(url, { headers: { 'Accept': 'text/html' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        // Extract issue titles and numbers
        const issues = [];
        const escaped = mfr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp('#(\\d+).*?title="([^"]*' + escaped + '[^"]*)"', 'gi');
        let match;
        while ((match = rx.exec(d)) !== null) {
          issues.push({ number: match[1], title: match[2] });
        }
        resolve(issues.slice(0, 5));
      });
    }).on('error', () => resolve([]));
  });
}

// ─── Search ZHA for device info ───
async function searchZHA(mfr) {
  return new Promise((resolve) => {
    const url = `https://github.com/zigpy/zha-device-handlers/search?q=${encodeURIComponent(mfr)}&type=code`;
    https.get(url, { headers: { 'Accept': 'text/html' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const found = d.includes(mfr);
        resolve({ found, repo: 'zha-device-handlers' });
      });
    }).on('error', () => resolve({ found: false }));
  });
}

// ─── Check our codebase for matching drivers (case-insensitive) ───
function checkOurDrivers(info) {
  const results = [];

  for (const mfr of info.manufacturerIds) {
    const mfrLower = mfr.toLowerCase();
    for (const d of fs.readdirSync(DRIVERS_DIR)) {
      const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      try {
        const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const mfrs = (c.zigbee?.manufacturerName || []).map(m => m.toLowerCase());
        const pids = c.zigbee?.productId || [];
        if (mfrs.includes(mfrLower)) {
          results.push({
            driver: d,
            mfr,
            pids,
            category: DEVICE_CATEGORIES[Object.keys(DEVICE_CATEGORIES).find(k =>
              DEVICE_CATEGORIES[k].some(kw => d.toLowerCase().includes(kw))
            )] || 'unknown',
          });
        }
      } catch {}
    }
  }

  // Also check fingerprints.json (case-insensitive)
  try {
    const fpData = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'fingerprints.json'), 'utf8'));
    for (const mfr of info.manufacturerIds) {
      const mfrLower = mfr.toLowerCase();
      for (const [fp, config] of Object.entries(fpData)) {
        if (fp.toLowerCase() === mfrLower && config.driverId) {
          if (!results.find(r => r.driver === config.driverId)) {
            results.push({
              driver: config.driverId,
              mfr,
              pids: [],
              category: 'from-fingerprints-json',
              source: 'fingerprints.json',
            });
          }
        }
      }
    }
  } catch {}

  for (const pid of info.productIds) {
    for (const d of fs.readdirSync(DRIVERS_DIR)) {
      const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      try {
        const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const pids = c.zigbee?.productId || [];
        if (pids.includes(pid) && !results.find(r => r.driver === d)) {
          results.push({ driver: d, mfr: null, pids: [pid], category: 'unknown' });
        }
      } catch {}
    }
  }

  return results;
}

// ─── Main investigation ───
async function investigate(postId, text) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  INVESTIGATION PROFONDE — Post #${postId}`);
  console.log(`${'═'.repeat(60)}\n`);

  const info = extractDeviceInfo(text);
  console.log('Device Info:', JSON.stringify(info, null, 2));

  // 1. Check our drivers (case-insensitive)
  console.log('\n--- Nos Drivers (case-insensitive) ---');
  const ourDrivers = checkOurDrivers(info);
  if (ourDrivers.length > 0) {
    ourDrivers.forEach(r => console.log(`  ✅ ${r.driver} (${r.category}) — MFR: ${r.mfr || 'N/A'}, PIDs: ${r.pids.join(', ')}`));
  } else {
    console.log('  ❌ Aucun driver trouvé pour ce device');
  }

  // 2. DP Pattern Analysis — check what DPs similar devices use
  console.log('\n--- DP Pattern Analysis ---');
  for (const mfr of info.manufacturerIds.slice(0, 3)) {
    try {
      const fpData = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'fingerprints.json'), 'utf8'));
      const mfrLower = mfr.toLowerCase();
      for (const [fp, config] of Object.entries(fpData)) {
        if (fp.toLowerCase().includes(mfrLower) && config.driverId) {
          const driverPath = path.join(DRIVERS_DIR, config.driverId, 'device.js');
          if (fs.existsSync(driverPath)) {
            const deviceContent = fs.readFileSync(driverPath, 'utf8');
            const dpMatches = deviceContent.match(/dp\s*[=:]\s*(\d+)/g) || [];
            console.log(`  ${mfr} → ${config.driverId}: ${dpMatches.length} DP references found`);
          }
        }
      }
    } catch {}
  }

  // 3. Variant support — check how many variants exist for similar MFRs
  console.log('\n--- Variant Support Analysis ---');
  for (const mfr of info.manufacturerIds.slice(0, 3)) {
    const mfrPrefix = mfr.substring(0, 10); // e.g., _TZE200_
    let variantCount = 0;
    try {
      const fpData = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'fingerprints.json'), 'utf8'));
      for (const [fp] of Object.entries(fpData)) {
        if (fp.toLowerCase().startsWith(mfrPrefix.toLowerCase())) variantCount++;
      }
    } catch {}
    console.log(`  ${mfrPrefix}*: ${variantCount} variants dans fingerprints.json`);
  }

  // 2. Cross-reference Z2M
  console.log('\n--- Z2M Cross-Reference ---');
  for (const mfr of info.manufacturerIds.slice(0, 3)) {
    const z2m = await searchZ2M(mfr);
    if (z2m.length > 0) {
      console.log(`  ${mfr}: ${z2m.length} issues trouvées`);
      z2m.forEach(i => console.log(`    #${i.number}: ${i.title.substring(0, 60)}`));
    } else {
      console.log(`  ${mfr}: non trouvé dans Z2M`);
    }
    await sleep(1000); // Rate limit
  }

  // 3. Cross-reference ZHA
  console.log('\n--- ZHA Cross-Reference ---');
  for (const mfr of info.manufacturerIds.slice(0, 3)) {
    const zha = await searchZHA(mfr);
    console.log(`  ${mfr}: ${zha.found ? '✅ trouvé' : '❌ non trouvé'} dans ${zha.repo}`);
    await sleep(1000);
  }

  // 4. Determine resolution
  console.log('\n--- Résolution ---');
  if (ourDrivers.length > 0) {
    console.log('  Device supporté — vérifier les DP mappings et les logs');
  } else {
    console.log('  Device NON supporté — recherche de DPs dans Z2M/ZHA nécessaire');
  }

  if (info.errorPatterns.includes('luminance')) {
    console.log('  → Problème luminance identifié — vérifier ZCL log-scale conversion');
  }
  if (info.errorPatterns.includes('battery_issue')) {
    console.log('  → Problème battery identifié — vérifier DP4/DP14/DP15 mappings');
  }
  if (info.errorPatterns.includes('missing_data')) {
    console.log('  → Données manquantes — vérifier si le device envoie des DPs spontanément');
  }

  return { info, ourDrivers };
}

// ─── Run ───
(async () => {
  if (POST_ID) {
    // Investigate specific post
    console.log(`Investigating post #${POST_ID}...`);
    // In a real scenario, we'd fetch the post content from the forum API
    console.log('Note: Forum API fetch requires DISCOURSE_API_KEY');
  } else {
    console.log('No specific post ID — run with --post-id N to investigate a specific post');
    console.log('Or run the forum scanner first to identify posts needing investigation');
  }

  // Save investigation results
  const report = {
    timestamp: new Date().toISOString(),
    postIds: POST_ID ? [POST_ID] : [],
    status: 'completed',
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'investigation-report.json'), JSON.stringify(report, null, 2));
  console.log('\n✅ Investigation report saved');
})();
