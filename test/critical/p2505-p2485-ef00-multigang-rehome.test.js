'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}
function hasMfr(driverId, needle) {
  const list = compose(driverId).zigbee?.manufacturerName || [];
  return list.some((m) => String(m).toLowerCase().includes(needle));
}

describe('P2505 / P2485 EF00 multi-gang rehome (stable BOTH)', () => {
  it('hewlydpz + 7ytnacie on wall_switch_4_gang_tuya only', () => {
    assert.ok(hasMfr('wall_switch_4_gang_tuya', 'hewlydpz'));
    assert.ok(hasMfr('wall_switch_4_gang_tuya', '7ytnacie'));
    assert.ok(!hasMfr('curtain_motor', 'hewlydpz'));
    assert.ok(!hasMfr('dimmer_wall_1gang', '7ytnacie'));
  });
  it('rkbxtclc on switch_3gang not dimmer', () => {
    assert.ok(hasMfr('switch_3gang', 'rkbxtclc'));
    assert.ok(!hasMfr('dimmer_wall_1gang', 'rkbxtclc'));
  });
  it('Ef00MultiGangProfiles + launchOnce present', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/tuya/Ef00MultiGangProfiles.js')));
    const ef00 = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.ok(ef00.includes('static async launchOnce'));
    assert.ok(ef00.includes('P2486b') || ef00.includes('collectManagers'));
  });
});
