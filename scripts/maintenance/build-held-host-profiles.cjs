#!/usr/bin/env node
'use strict';
// P3331: runtime profile of every hosted held driver (lib/drivers/held-driver-folds.json, kind "host").
// The held driver.compose.json does not ship, so its class, capabilities and capability options are
// copied here for the host's onMapDeviceClass wrapper. Usage: node scripts/maintenance/build-held-host-profiles.cjs [--check]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'lib', 'drivers', 'held-host-profiles.json');

function build(root = ROOT) {
  const { folds } = JSON.parse(fs.readFileSync(path.join(root, 'lib', 'drivers', 'held-driver-folds.json'), 'utf8'));
  const compose = (id) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8'));
  const profiles = {};
  for (const [held, f] of Object.entries(folds).sort(([a], [b]) => a.localeCompare(b))) {
    if (f.kind !== 'host') { continue; }
    const c = compose(held);
    const host = compose(f.into);
    profiles[held] = {
      into: f.into,
      class: c.class,
      hostClass: host.class,
      capabilities: c.capabilities || [],
      capabilitiesOptions: c.capabilitiesOptions || {},
    };
  }
  return { _generated: 'scripts/maintenance/build-held-host-profiles.cjs (do not edit)', profiles };
}

function render(root = ROOT) { return `${JSON.stringify(build(root), null, 1)}\n`; }

if (require.main === module) {
  const want = render();
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (have !== want) { console.error('[P3331] lib/drivers/held-host-profiles.json is stale: run node scripts/maintenance/build-held-host-profiles.cjs'); process.exit(1); }
    console.log('[P3331] held host profiles in sync');
  } else {
    fs.writeFileSync(OUT, want);
    console.log(`[P3331] wrote ${path.relative(ROOT, OUT)} (${Object.keys(build().profiles).length} profiles)`);
  }
}

module.exports = { build, render };
