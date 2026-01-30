#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const reportPath = path.join(__dirname, '../../data/community-sync/report.json');

if (!fs.existsSync(reportPath)) { console.log('❌ No report'); process.exit(0); }

const r = JSON.parse(fs.readFileSync(reportPath));
console.log('## 🌐 Community Sync Report\n');
console.log(`**Date:** ${r.ts}\n`);

if (r.src.johan) {
  console.log('### JohanBendz Fork');
  console.log(r.src.johan.error ? `❌ ${r.src.johan.error}` : `✅ ${r.src.johan.count} fingerprints`);
}
if (r.src.z2m) {
  console.log('\n### Zigbee2MQTT');
  console.log(r.src.z2m.error ? `❌ ${r.src.z2m.error}` : `✅ ${r.src.z2m.count} IDs found`);
}
if (r.src.gh) {
  console.log('\n### GitHub Issues');
  console.log(`- Issues: ${r.src.gh.issueCount || 0}`);
  console.log(`- PRs: ${r.src.gh.prCount || 0}`);
  console.log(`- Device requests: ${(r.src.gh.deviceRequests || []).length}`);
}
