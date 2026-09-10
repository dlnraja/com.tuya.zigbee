'use strict';

/**
 * P2459 — Forum recurrence (VicHY #2227 + Eduard #2228)
 * - VicHY clrdrnya: refuse phantom curtain/battery re-add after tip update
 * - Eduard fodv6bkr: still on curtain_motor (tip ≥9.0.837; user was on 9.0.809)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

describe('P2459 VicHY #2227 + Eduard #2228 forum recurrence', () => {
  it('presence_sensor_radar refuses phantom addCapability + re-heals on config upgrade', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('P2459'), 'must reference P2459');
    assert.ok(src.includes('refused addCapability'), 'must refuse phantom addCapability');
    assert.ok(src.includes('config upgrade'), 'must upgrade config when mfr arrives');
    assert.ok(src.includes('_healRadarPhantomCaps'), 'must heal phantoms');
    assert.ok(/forceMains|clrdrnya/.test(src), 'must force-mains heal for clrdrnya');
  });

  it('app.json keeps clrdrnya on presence_sensor_radar and fodv6bkr on curtain_motor', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const radar = app.drivers.find((d) => d.id === 'presence_sensor_radar');
    const curtain = app.drivers.find((d) => d.id === 'curtain_motor');
    assert.ok(radar, 'presence_sensor_radar driver');
    assert.ok(curtain, 'curtain_motor driver');
    const radarMfr = radar.zigbee?.manufacturerName || [];
    const curtainMfr = curtain.zigbee?.manufacturerName || [];
    assert.ok(radarMfr.some((m) => /clrdrnya/i.test(m)), 'clrdrnya must stay in app.json radar');
    assert.ok(curtainMfr.some((m) => /fodv6bkr/i.test(m)), 'fodv6bkr must stay in app.json curtain_motor');
    assert.ok((curtain.zigbee?.productId || []).some((p) => /^TS0601$/i.test(p)), 'TS0601 on curtain_motor');
  });

  it('DynCap stays disabled for presence_sensor_radar (no curtain invent)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/dynamic/DynamicCapabilityManager.js'), 'utf8');
    assert.ok(/presence_sensor_radar/.test(src));
    assert.ok(src.includes('_isDynCapDisabledForDevice'));
  });

  it('sacred-keep pins both couples', () => {
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
      'utf8'
    ));
    const couples = keep.couples || keep;
    const list = Array.isArray(couples) ? couples : (couples.pins || []);
    const flat = JSON.stringify(keep);
    assert.ok(/clrdrnya/i.test(flat), 'sacred-keep clrdrnya');
    assert.ok(/fodv6bkr/i.test(flat), 'sacred-keep fodv6bkr');
  });
});
