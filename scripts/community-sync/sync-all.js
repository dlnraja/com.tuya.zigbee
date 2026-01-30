#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getCurrentFingerprints } = require('./compare-fingerprints');

const OUT = path.join(__dirname, '../../data/community-sync');

async function main() {
  console.log('🌐 Community Sync Starting...\n');
  fs.mkdirSync(OUT, { recursive: true });

  const current = getCurrentFingerprints();
  console.log(`📊 Current fingerprints in app: ${current.size}`);

  const r = { ts: new Date().toISOString(), currentCount: current.size, src: {}, newFps: [] };

  // Johan sync
  try {
    console.log('\n🔄 JohanBendz sync...');
    r.src.johan = require('./extract-johan')();
    if (r.src.johan.fingerprints) {
      r.src.johan.fingerprints.forEach(fp => {
        if (!current.has(fp.mfr)) r.newFps.push({ ...fp, source: 'Johan' });
      });
    }
  } catch(e) { r.src.johan = { error: e.message }; }

  // Z2M sync (async)
  try {
    console.log('🔄 Zigbee2MQTT sync...');
    r.src.z2m = await require('./extract-z2m')();
    if (r.src.z2m.sample) {
      r.src.z2m.sample.forEach(mfr => {
        if (!current.has(mfr)) r.newFps.push({ mfr, source: 'Z2M' });
      });
    }
  } catch(e) { r.src.z2m = { error: e.message }; }

  // GitHub issues (async)
  try {
    console.log('🔄 GitHub issues sync...');
    r.src.gh = await require('./parse-issues')();
  } catch(e) { r.src.gh = { error: e.message }; }

  // Dedupe new fingerprints
  const seen = new Set();
  r.newFps = r.newFps.filter(fp => {
    if (seen.has(fp.mfr)) return false;
    seen.add(fp.mfr);
    return true;
  });

  r.newCount = r.newFps.length;
  console.log(`\n✅ Found ${r.newCount} NEW fingerprints not in current app`);

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(r, null, 2));
  fs.writeFileSync(path.join(OUT, 'new-fingerprints.json'), JSON.stringify(r.newFps, null, 2));
  console.log('✅ Sync complete - reports saved to data/community-sync/');
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
