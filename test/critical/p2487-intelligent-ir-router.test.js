'use strict';

/**
 * P2487 — Intelligent IR router Contre quoi locks
 * - WiFi flow compose stays empty
 * - Pronto paste never converts to Zosung
 * - Virtual remote hardcodes Zigbee-only sender settings
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  normalizeCode,
  detectFormat,
  prontoToZosungBase64,
  makeLearnedEntry,
  upsertLearnedMap,
} = require('../../lib/ir/IRFormatConverter');
const { IntelligentIRRouter, SENDER_DRIVERS } = require('../../lib/ir/IntelligentIRRouter');

describe('P2487 Intelligent IR router', () => {
  it('detects Pronto and converts to Zosung base64', () => {
    // Minimal Pronto: freq + one pair (synthetic)
    const pronto = '0000 006C 0000 0001 0001 0001';
    assert.equal(detectFormat(pronto), 'pronto');
    const z = prontoToZosungBase64(pronto);
    assert.ok(z && typeof z === 'string' && z.length > 4);
    const norm = normalizeCode(pronto, { target: 'zigbee', format: 'pronto' });
    assert.equal(norm.ok, true);
    assert.ok(norm.zigbeeCode);
  });

  it('keeps opaque string for WiFi target', () => {
    const opaque = 'ABCDEFGHIJKLMNOPQRSTUVWX0123456789+/==';
    const norm = normalizeCode(opaque, { target: 'wifi', format: 'auto' });
    assert.equal(norm.ok, true);
    assert.equal(norm.wifiCode, opaque);
  });

  it('rejects empty / garbage for Zigbee', () => {
    const bad = normalizeCode('??', { target: 'zigbee' });
    assert.equal(bad.ok, false);
  });

  it('learned-code schema upserts by name', () => {
    const e = makeLearnedEntry({ name: 'Power', code: 'abc12345====', format: 'tuya_opaque' });
    const map = upsertLearnedMap({}, e);
    assert.equal(map.Power.code, 'abc12345====');
    assert.ok(map.Power.updatedAt);
  });

  it('SENDER_DRIVERS includes zigbee + wifi', () => {
    assert.ok(SENDER_DRIVERS.includes('ir_blaster'));
    assert.ok(SENDER_DRIVERS.includes('wifi_ir_remote'));
    assert.ok(SENDER_DRIVERS.includes('blaster_remote'));
  });

  it('wifi_ir_remote flow compose is non-empty (actions + triggers)', () => {
    const p = path.join(ROOT, 'drivers', 'wifi_ir_remote', 'driver.flow.compose.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(Array.isArray(j.actions) && j.actions.length >= 3, 'wifi IR actions missing');
    assert.ok(Array.isArray(j.triggers) && j.triggers.length >= 2, 'wifi IR triggers missing');
    const ids = j.actions.map((a) => a.id);
    assert.ok(ids.includes('wifi_ir_remote_send_learned'));
    assert.ok(ids.includes('wifi_ir_remote_send_raw'));
    assert.ok(ids.includes('wifi_ir_remote_start_learn'));
  });

  // Contre quoi: Athom requires [[device]] in titleFormatted when device arg exists;
  // project forbids that pattern — title-only cards (P2487 publish gate).
  it('wifi_ir_remote flow cards omit titleFormatted (no [[device]] trap)', () => {
    const p = path.join(ROOT, 'drivers', 'wifi_ir_remote', 'driver.flow.compose.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const card of [...(j.actions || []), ...(j.triggers || [])]) {
      assert.equal(
        card.titleFormatted,
        undefined,
        `${card.id} must not set titleFormatted (Homey [[device]] vs project rule)`,
      );
    }
  });

  it('ir_remote compose exposes multi-transport settings (not Zigbee-only)', () => {
    const p = path.join(ROOT, 'drivers', 'ir_remote', 'driver.compose.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const ids = (j.settings || []).map((s) => s.id);
    assert.ok(ids.includes('transport_driver'));
    assert.ok(ids.includes('transport_id'));
    const td = j.settings.find((s) => s.id === 'transport_driver');
    const vals = (td.values || []).map((v) => v.id);
    assert.ok(vals.includes('wifi_ir_remote'));
    assert.ok(vals.includes('ir_blaster'));
    // Contre quoi: incomplete zigbee block without endpoints fails Homey publish
    assert.equal(j.zigbee, undefined, 'ir_remote is virtual — no zigbee block');
  });

  it('infer/mfs never treat ir_remote as Zigbee FP target', () => {
    const inferSrc = fs.readFileSync(
      path.join(ROOT, 'tools', 'ci', 'infer-enrich-from-incomplete.js'),
      'utf8',
    );
    assert.ok(inferSrc.includes("VIRTUAL_NO_ZIGBEE = new Set(['ir_remote'])"));
    assert.ok(inferSrc.includes("ir_remote: 'ir_blaster'"));
    const reinject = fs.readFileSync(
      path.join(ROOT, 'tools', 'ci', 're-inject-manual-fixes.js'),
      'utf8',
    );
    assert.ok(reinject.includes('stripVirtualIrRemoteZigbee'));
    assert.ok(reinject.includes('p2487-tz3290-ir-blaster'));
  });

  it('router listSenders works with mock homey (empty)', () => {
    const homey = {
      drivers: {
        getDriver() {
          throw new Error('no driver');
        },
      },
    };
    const r = new IntelligentIRRouter(homey);
    assert.deepEqual(r.listSenders(), []);
  });

  it('shared wizard assets exist for pair/repair', () => {
    for (const rel of [
      'assets/ir/ir_setup_wizard.html',
      'drivers/ir_remote/pair/ir_setup.html',
      'drivers/ir_blaster/repair/ir_setup.html',
      'drivers/wifi_ir_remote/pair/ir_setup.html',
      'lib/ir/IntelligentIRRouter.js',
      'lib/ir/IRFormatConverter.js',
      'lib/ir/irWizardSession.js',
      'docs/architecture/INTELLIGENT_IR_SSOT.md',
      'config/architecture/intelligent-ir-ssot.json',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
    }
  });
});
