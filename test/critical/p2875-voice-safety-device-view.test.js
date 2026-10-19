'use strict';
// P2875: the voice-safety gate (check:voice) follows the P2614/P2615 rule on
// every branch: button.* is never getable/setable; class button|remote may
// keep maintenanceAction:false (Homey device-view Button N), other classes
// must stay Maintenance-only.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GATE = path.join(ROOT, 'scripts/validation/check-google-assistant-voice-safety.js');

describe('P2875 voice-safety gate', () => {
  it('passes on this tree', () => {
    const r = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  it('device-view buttons (maintenanceAction:false) only on class button|remote, never getable/setable', () => {
    const bad = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(p)) { continue; }
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const [id, o] of Object.entries(c.capabilitiesOptions || {})) {
        if (!id.startsWith('button.') || !(c.capabilities || []).includes(id)) { continue; }
        if (o.getable === true || o.setable === true) { bad.push(`${d}:${id} command surface`); }
        if (o.maintenanceAction === false && !['button', 'remote'].includes(c.class)) { bad.push(`${d}:${id} device-view on class ${c.class}`); }
      }
    }
    assert.deepEqual(bad, []);
  });
});
