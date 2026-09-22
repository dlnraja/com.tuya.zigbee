'use strict';

/**
 * P2685 — Bastien pile conso (TS0041 / skipBatteryReporting remotes)
 * Contre quoi: wake/re-arm storms reading powerCfg + force magic every announce.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2685 sleepy remote battery conservation', () => {
  it('TuyaMagicPacket force respects FORCE_COOLDOWN_MS', () => {
    const magic = require('../../lib/zigbee/TuyaMagicPacket');
    assert.ok(magic.FORCE_COOLDOWN_MS >= 6 * 60 * 60 * 1000);
    assert.ok(magic.STORE_TS);
    const src = fs.readFileSync(path.join(ROOT, 'lib/zigbee/TuyaMagicPacket.js'), 'utf8');
    assert.match(src, /P2685 skip force \(cooldown/);
  });

  it('PhysicalButtonMixin skips announce powerCfg read when skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /P2685 skip announce powerCfg read/);
    assert.match(src, /skipBattTx/);
  });

  it('ButtonDevice skips ZCL battery TX when skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /P2685 skip ZCL readAttributes \(skipBatteryReporting/);
  });

  it('PowerClusterPolicy refuses proactive read for skipBatteryReporting', () => {
    const { shouldProactivePowerCfgRead } = require('../../lib/zigbee/PowerClusterPolicy');
    assert.strictEqual(shouldProactivePowerCfgRead({
      getDeviceProfile: () => ({ skipBatteryReporting: true }),
    }), false);
    assert.strictEqual(shouldProactivePowerCfgRead({
      getDeviceProfile: () => ({ noEf00Tx: true }),
    }), false);
  });

  it('axpdxqgu profile keeps skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /'_TZ3000_axpdxqgu'\s*:\s*\{[\s\S]*?skipBatteryReporting:\s*true/);
  });
});
