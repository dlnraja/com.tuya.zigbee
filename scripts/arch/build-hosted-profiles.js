#!/usr/bin/env node
'use strict';
// P3264: config/architecture/hosted-profiles.json + held driver composes -> lib/hosting/hosted-profiles.runtime.json
// (exact couples per hosted profile, read by HostedProfiles at runtime). --check exits 1 when out of sync.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function build(root = ROOT) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/hosted-profiles.json'), 'utf8'));
  const out = { _generated: 'scripts/arch/build-hosted-profiles.js (P3264) - do not edit', hosts: {} };
  for (const [host, ids] of Object.entries(cfg.hosts)) {
    out.hosts[host] = ids.map((id) => {
      const c = JSON.parse(fs.readFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8'));
      const z = c.zigbee || {};
      return { id, class: c.class, manufacturerName: arr(z.manufacturerName), productId: arr(z.productId), module: `drivers/${id}/device.js` };
    });
  }
  return out;
}

module.exports = { build };
if (require.main === module) {
  const file = path.join(ROOT, 'lib/hosting/hosted-profiles.runtime.json');
  const next = `${JSON.stringify(build(), null, 1)}\n`;
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (cur !== next) { console.error('hosted-profiles.runtime.json out of sync: run node scripts/arch/build-hosted-profiles.js'); process.exit(1); }
    console.log('hosted-profiles runtime table in sync');
  } else { fs.writeFileSync(file, next); console.log(`wrote ${path.relative(ROOT, file)}`); }
}
