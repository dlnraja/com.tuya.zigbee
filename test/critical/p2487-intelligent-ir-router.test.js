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
  zosungBase64ToPronto,
  toProntoForHomey,
  makeLearnedEntry,
  upsertLearnedMap,
} = require('../../lib/ir/IRFormatConverter');
const {
  IntelligentIRRouter,
  SENDER_DRIVERS,
  HOMEY_IR_SENDER_ID,
} = require('../../lib/ir/IntelligentIRRouter');
const HomeyInfraredTx = require('../../lib/ir/HomeyInfraredTx');

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

  // Contre quoi: Homey reserves Flow arg name "duration"
  it('wifi_ir_remote start_learn uses timeout_s not duration', () => {
    const p = path.join(ROOT, 'drivers', 'wifi_ir_remote', 'driver.flow.compose.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const start = (j.actions || []).find((a) => a.id === 'wifi_ir_remote_start_learn');
    assert.ok(start);
    const names = (start.args || []).map((a) => a.name);
    assert.ok(names.includes('timeout_s'));
    assert.ok(!names.includes('duration'));
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
    assert.ok(vals.includes('homey_infrared'), '3rd path Homey onboard IR');
    // Contre quoi: incomplete zigbee block without endpoints fails Homey publish
    assert.equal(j.zigbee, undefined, 'ir_remote is virtual — no zigbee block');
  });

  // Contre quoi: Pronto↔Zosung round-trip breaks Homey TX after Zigbee learn/paste
  it('Pronto → Zosung → Pronto round-trip for Homey TX', () => {
    const pronto = '0000 006C 0000 0001 0001 0001';
    const z = prontoToZosungBase64(pronto);
    assert.ok(z);
    const back = zosungBase64ToPronto(z);
    assert.ok(back && /^0000\s/i.test(back));
    const homey = normalizeCode(pronto, { target: 'homey', format: 'pronto' });
    assert.equal(homey.ok, true);
    assert.ok(homey.prontoCode);
    assert.ok(toProntoForHomey(z, 'zosung'));
  });

  it('lists Homey infrared sender when rf manager present', () => {
    const calls = [];
    const homey = {
      drivers: { getDriver() { throw new Error('no'); } },
      rf: {
        txInfraredProntohex(args) {
          calls.push(args);
          return Promise.resolve(true);
        },
      },
    };
    const r = new IntelligentIRRouter(homey);
    const senders = r.listSenders();
    assert.equal(senders.length, 1);
    assert.equal(senders[0].id, HOMEY_IR_SENDER_ID);
    assert.equal(senders[0].transport, 'homey');
    assert.equal(senders[0].learnSupported, false);
  });

  it('Homey learn refuses (TX-only); sendPronto uses soft RF API', async () => {
    const calls = [];
    const homey = {
      drivers: { getDriver() { throw new Error('no'); } },
      rf: {
        txInfraredProntohex(args) {
          calls.push(args);
          return Promise.resolve(true);
        },
      },
    };
    const r = new IntelligentIRRouter(homey);
    await assert.rejects(
      () => r.learn({ senderId: HOMEY_IR_SENDER_ID, name: 'x' }),
      /TX-only/,
    );
    await HomeyInfraredTx.sendPronto(homey, '0000 006C 0000 0001 0001 0001');
    assert.equal(calls.length, 1);
    assert.match(calls[0].payload, /^0000 /);
  });

  it('compose has IR permission + Pronto signal; SSOT lists homey transport', () => {
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose', 'app.json'), 'utf8'));
    assert.ok((compose.permissions || []).includes('homey:wireless:ir'));
    const signal = path.join(ROOT, '.homeycompose', 'signals', 'ir', 'intelligent_ir_pronto.json');
    assert.ok(fs.existsSync(signal));
    const sig = JSON.parse(fs.readFileSync(signal, 'utf8'));
    assert.equal(sig.type, 'prontohex');
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'intelligent-ir-ssot.json'), 'utf8'),
    );
    assert.ok(ssot.transports.includes('homey_infrared_tx'));
    assert.ok(!ssot.outOfScope.includes('homey_manager_infrared'));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'ir', 'HomeyInfraredTx.js')));
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
      'lib/ir/HomeyInfraredTx.js',
      'lib/ir/irWizardSession.js',
      'docs/architecture/INTELLIGENT_IR_SSOT.md',
      'docs/architecture/INTELLIGENT_IR.md',
      'config/architecture/intelligent-ir-ssot.json',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
    }
  });

  it('wizard starts with sender pick (Zigbee/WiFi/Homey)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'assets', 'ir', 'ir_setup_wizard.html'), 'utf8');
    assert.ok(html.includes('id="s-sender"'));
    assert.ok(html.includes('homey_infrared') || html.includes('Homey Pro 2023'));
    assert.ok(html.includes('list_senders'));
  });

  it('ir_remote flow parity: learned/raw/learn + no broken send_command', () => {
    const p = path.join(ROOT, 'drivers', 'ir_remote', 'driver.flow.compose.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const ids = (j.actions || []).map((a) => a.id);
    assert.ok(ids.includes('ir_remote_send_command'));
    assert.ok(ids.includes('ir_remote_send_learned'));
    assert.ok(ids.includes('ir_remote_send_raw'));
    assert.ok(ids.includes('ir_remote_start_learn'));
    for (const card of j.actions || []) {
      assert.equal(card.titleFormatted, undefined, `${card.id} omit titleFormatted`);
    }
    const drv = fs.readFileSync(path.join(ROOT, 'drivers', 'ir_remote', 'driver.js'), 'utf8');
    assert.ok(!drv.includes('onCapabilityOnOff(true)'), 'send_command must not ignore command arg');
    assert.ok(drv.includes('ir_remote_send_learned'));
  });

  it('router rename/delete learned codes', async () => {
    const store = {
      _map: {},
      async getStoreValue(k) { return k === 'learned_codes' ? this._map : null; },
      async setStoreValue(k, v) { if (k === 'learned_codes') this._map = v; },
    };
    const r = new IntelligentIRRouter({ drivers: { getDriver() { throw new Error('x'); } } });
    await r.saveLearnedMap(store, upsertLearnedMap({}, makeLearnedEntry({
      name: 'Power', code: '0000 006C 0000 0001 0001 0001', format: 'pronto',
    })));
    await r.renameCode(store, 'Power', 'Power On');
    const map = await r.getLearnedMap(store);
    assert.ok(map['Power On']);
    assert.equal(map.Power, undefined);
    assert.equal(await r.deleteCode(store, 'Power On'), true);
    assert.deepEqual(await r.getLearnedMap(store), {});
  });

  it('blaster_remote exposes P2487 learn aliases for router', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers', 'blaster_remote', 'device.js'), 'utf8');
    assert.ok(src.includes('enableLearnMode'));
    assert.ok(src.includes('_enableAdvancedLearnMode'));
    assert.ok(src.includes('IntelligentIRRouter'));
  });

  it('dual-app classifies P2487 as MASTER_ONLY', () => {
    const dual = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'dual-app-tracks.json'), 'utf8'));
    assert.equal(dual.l99RecentClassification.p2487_intelligent_ir_ux.tag, 'MASTER_ONLY');
    assert.equal(dual.l99RecentClassification.p2487c_homey_infrared_tx.tag, 'MASTER_ONLY');
  });
});
