#!/usr/bin/env node
/**
 * Generate Community Sync Summary Report (for GitHub Step Summary)
 * v5.12.1: Enriched with productId, deviceType, vendor, capabilities, battery
 */
const fs = require('fs'), path = require('path');
const reportPath = path.join(__dirname, '../../data/community-sync/report.json');

if (!fs.existsSync(reportPath)) { console.log(' No report'); process.exit(0); }

const r = JSON.parse(fs.readFileSync(reportPath));
console.log('##  Community Sync Report\n');
console.log(`**Date:** ${r.ts}`);
console.log(`**Current fingerprints in app:** ${r.currentCount}\n`);

// === Source summaries ===
if (r.src.johan) {
  console.log('### JohanBendz Fork');
  if (r.src.johan.error) {
    console.log(` ${r.src.johan.error}`);
  } else {
    console.log(` ${r.src.johan.count} fingerprints (enriched: ${r.src.johan.enriched || false})`);
  }
}
if (r.src.z2m) {
  console.log('\n### Zigbee2MQTT');
  if (r.src.z2m.error) {
    console.log(` ${r.src.z2m.error}`);
  } else {
    console.log(` ${r.src.z2m.count} fingerprints (enriched: ${r.src.z2m.enriched || false})`);
  }
}
if (r.src.gh) {
  console.log('\n### GitHub Issues');
  console.log(`- Issues: ${r.src.gh.issueCount || 0}`);
  console.log(`- PRs: ${r.src.gh.prCount || 0}`);
  console.log(`- Device requests: ${(r.src.gh.deviceRequests || []).length}`);
}

// === Enriched stats ===
console.log('\n###  Enrichment Stats');
console.log(`- Total enriched FPs: ${r.enrichedCount || 0}`);
console.log(`- New FPs found: ${r.newCount || 0}`);

const newFps = r.newFps || [];
if (newFps.length > 0) {
  const withPid = newFps.filter(f => f.productId).length;
  const withVendor = newFps.filter(f => f.vendor).length;
  const withType = newFps.filter(f => f.driver || f.deviceType).length;
  const withCaps = newFps.filter(f => (f.capabilities || []).length > 0).length;
  const withBat = newFps.filter(f => f.hasBattery).length;
  
  console.log(`- With productId: ${withPid}/${newFps.length}`);
  console.log(`- With vendor: ${withVendor}/${newFps.length}`);
  console.log(`- With device type: ${withType}/${newFps.length}`);
  console.log(`- With capabilities: ${withCaps}/${newFps.length}`);
  console.log(`- Battery devices: ${withBat}/${newFps.length}`);
  
  // === Top new fingerprints table ===
  console.log('\n###  New Fingerprints (Top 30)\n');
  console.log('| Manufacturer | Product ID | Type | Source | Vendor | Capabilities |');
  console.log('|---|---|---|---|---|---|');
  for (const f of newFps.slice(0, 30)) {
    const caps = (f.capabilities || []).slice(0, 3).join(', ') || '-';
    console.log(`| \`${f.mfr}\` | ${f.productId || '-'} | ${f.driver || f.deviceType || '-'} | ${f.source} | ${f.vendor || '-'} | ${caps} |`);
  }
  if (newFps.length > 30) {
    console.log(`\n*...and ${newFps.length - 30} more (see data/community-sync/new-fingerprints.json)*`);
  }
}
