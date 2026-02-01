#!/usr/bin/env node
/**
 * Community Sync - Universal Tuya Zigbee
 * v5.7.46: Enhanced with productId extraction and device type mapping
 */
const fs = require('fs');
const path = require('path');
const { getCurrentFingerprints } = require('./compare-fingerprints');

const OUT = path.join(__dirname, '../../data/community-sync');

// Device type inference from productId
const inferDeviceType = (productId, description) => {
  if (!productId && !description) return null;
  const id = (productId || '').toUpperCase();
  const desc = (description || '').toLowerCase();
  
  // TS0601 devices - infer from description
  if (id === 'TS0601') {
    if (desc.includes('curtain') || desc.includes('cover') || desc.includes('blind')) return 'curtain_motor';
    if (desc.includes('thermostat') || desc.includes('trv') || desc.includes('radiator')) return 'radiator_valve';
    if (desc.includes('presence') || desc.includes('radar') || desc.includes('mmwave')) return 'presence_sensor_radar';
    if (desc.includes('motion') || desc.includes('pir')) return 'motion_sensor';
    if (desc.includes('temp') || desc.includes('humidity') || desc.includes('climate')) return 'climate_sensor';
    if (desc.includes('valve') || desc.includes('water')) return 'water_valve_smart';
    if (desc.includes('dimmer')) return 'dimmer_wall_1gang';
    if (desc.includes('switch')) return 'switch_1gang';
    return null;
  }
  
  // ZCL-based devices
  if (id.startsWith('TS0001')) return 'switch_1gang';
  if (id.startsWith('TS0002')) return 'switch_2gang';
  if (id.startsWith('TS0003')) return 'switch_3gang';
  if (id.startsWith('TS0004')) return 'switch_4gang';
  if (id.startsWith('TS011')) return 'plug';
  if (id.startsWith('TS0201')) return 'climate_sensor';
  if (id.startsWith('TS0202')) return 'motion_sensor';
  if (id.startsWith('TS0203')) return 'contact_sensor';
  if (id.startsWith('TS0207')) return 'water_leak_sensor';
  if (id.startsWith('TS0210')) return 'vibration_sensor';
  if (id.startsWith('TS0041')) return 'button_wireless_1';
  if (id.startsWith('TS0042')) return 'button_wireless_2';
  if (id.startsWith('TS0043')) return 'button_wireless_3';
  if (id.startsWith('TS0044')) return 'button_wireless_4';
  if (id.startsWith('TS004F')) return 'button_wireless_4';
  if (id.startsWith('TS0302')) return 'curtain_motor';
  if (id.startsWith('TS130')) return 'curtain_motor';
  
  return null;
};

async function main() {
  console.log('🌐 Community Sync Starting...\n');
  fs.mkdirSync(OUT, { recursive: true });

  const current = getCurrentFingerprints();
  console.log(`📊 Current fingerprints in app: ${current.size}`);

  const r = { 
    ts: new Date().toISOString(), 
    currentCount: current.size, 
    src: {}, 
    newFps: [],
    enrichedFps: []  // v5.7.46: Full device details
  };

  // Johan sync
  try {
    console.log('\n🔄 JohanBendz sync...');
    r.src.johan = require('./extract-johan')();
    if (r.src.johan.fingerprints) {
      r.src.johan.fingerprints.forEach(fp => {
        const enriched = { ...fp, source: 'Johan', driver: fp.driver || inferDeviceType(fp.productId, fp.description) };
        r.enrichedFps.push(enriched);
        if (!current.has(fp.mfr)) r.newFps.push(enriched);
      });
    }
  } catch(e) { r.src.johan = { error: e.message }; }

  // Z2M sync (async) - Now with enriched data
  try {
    console.log('🔄 Zigbee2MQTT sync...');
    r.src.z2m = await require('./extract-z2m')();
    if (r.src.z2m.fingerprints) {
      r.src.z2m.fingerprints.forEach(fp => {
        const driver = inferDeviceType(fp.productId, fp.description);
        const enriched = { ...fp, driver };
        r.enrichedFps.push(enriched);
        if (!current.has(fp.mfr)) r.newFps.push(enriched);
      });
    }
  } catch(e) { r.src.z2m = { error: e.message }; }

  // GitHub issues (async)
  try {
    console.log('🔄 GitHub issues sync...');
    r.src.gh = await require('./parse-issues')();
  } catch(e) { r.src.gh = { error: e.message }; }

  // Dedupe new fingerprints, prefer entries with more details
  const seen = {};
  r.newFps = r.newFps.filter(fp => {
    if (seen[fp.mfr]) {
      // Keep the one with more details
      if (fp.productId && !seen[fp.mfr].productId) {
        seen[fp.mfr] = fp;
      }
      return false;
    }
    seen[fp.mfr] = fp;
    return true;
  });

  r.newCount = r.newFps.length;
  r.enrichedCount = r.enrichedFps.length;
  
  console.log(`\n✅ Found ${r.newCount} NEW fingerprints not in current app`);
  console.log(`📊 Total enriched fingerprints: ${r.enrichedCount}`);

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(r, null, 2));
  fs.writeFileSync(path.join(OUT, 'new-fingerprints.json'), JSON.stringify(r.newFps, null, 2));
  fs.writeFileSync(path.join(OUT, 'all-enriched.json'), JSON.stringify(r.enrichedFps, null, 2));
  console.log('✅ Sync complete - reports saved to data/community-sync/');
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
