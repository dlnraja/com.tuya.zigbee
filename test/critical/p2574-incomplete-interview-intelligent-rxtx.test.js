'use strict';

/**
 * P2574 — Incomplete / unsupported Homey interview → intelligent DP / ZCL / raw RX-TX
 *
 * Contre quoi:
 * - applyIntelligentProtocol wipes forcePureTuyaDp on incomplete zclNode
 * - known EF00-only mfr falls through to weak HYBRID without parallelDiscover
 * - bootstrap skips compensation when interview omits native clusters
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  detectIntelligentProtocol,
  applyIntelligentProtocol,
} = require(path.join(ROOT, 'lib/protocol/IntelligentProtocolDetect.js'));
const {
  isKnownEf00OnlyManufacturer,
  forcePureTuyaDp,
  armIncompleteInterviewCompensation,
} = require(path.join(ROOT, 'lib/zigbee/Ef00OnlyInterview.js'));

function mockDevice(opts = {}) {
  const settings = opts.settings || {};
  return {
    getSetting: (k) => settings[k],
    getSettings: () => settings,
    getData: () => opts.data || {
      manufacturerName: settings.zb_manufacturer_name,
      modelId: settings.zb_model_id,
    },
    getStore: () => opts.store || {},
    zclNode: opts.zclNode || { endpoints: {} },
    _manufacturerConfig: opts.cfg || {},
    ...opts.extra,
  };
}

describe('P2574 incomplete interview intelligent DP/cluster/raw', () => {
  it('known EF00-only mfr → TUYA_DP + parallelDiscover even with empty interview', () => {
    assert.ok(isKnownEf00OnlyManufacturer('_TZE284_ogx8u5z6'));
    const device = mockDevice({
      settings: {
        zb_manufacturer_name: '_TZE284_ogx8u5z6',
        zb_model_id: 'TS0601',
      },
      zclNode: { endpoints: { 1: { clusters: {} } } },
    });
    const info = detectIntelligentProtocol(device);
    assert.strictEqual(info.protocol, 'TUYA_DP');
    assert.ok(info.isPureTuyaDP);
    assert.ok(info.parallelDiscover);
    assert.ok(info.preferDpTx);
    assert.ok(info.interviewIncomplete);
    assert.match(info.reason, /ef00_only_mfr/);
  });

  it('TS0601 incomplete interview arms hybrid + parallelDiscover', () => {
    const device = mockDevice({
      settings: {
        zb_manufacturer_name: '_TZE204_unknownxyz',
        zb_model_id: 'TS0601',
      },
      zclNode: { endpoints: {} },
    });
    const info = detectIntelligentProtocol(device);
    assert.strictEqual(info.protocol, 'HYBRID');
    assert.ok(info.parallelDiscover);
    assert.ok(info.preferDpTx);
    assert.ok(info.interviewIncomplete);
  });

  it('applyIntelligentProtocol preserves forcePureTuyaDp', () => {
    const device = mockDevice({
      settings: {
        zb_manufacturer_name: '_TZ3000_abcdef12',
        zb_model_id: 'TS0001',
      },
      zclNode: {
        endpoints: {
          1: { clusters: { onOff: {}, basic: {} } },
        },
      },
    });
    forcePureTuyaDp(device, { force: true });
    assert.ok(device._isPureTuyaDP);
    applyIntelligentProtocol(device);
    assert.ok(device._isPureTuyaDP, 'forced pure must survive detect');
    assert.ok(device._parallelDiscover);
  });

  it('armIncompleteInterviewCompensation sets PFC + flags', async () => {
    const device = mockDevice({
      settings: { zb_manufacturer_name: '_TZE204_clrdrnya', zb_model_id: 'TS0601' },
    });
    const r = await armIncompleteInterviewCompensation(device, device.zclNode, {
      mfr: '_TZE204_clrdrnya',
      skipMagic: true,
      negotiateMcu: false,
      rescanDelayMs: 0,
    });
    assert.ok(r.ok);
    assert.ok(device._parallelDiscover);
    assert.ok(device._incompleteInterviewCompensated);
    assert.ok(device._protocolFallbackChain || device._p2473Pfc);
  });

  it('bootstrap + detect sources wire P2574 markers', () => {
    const boot = fs.readFileSync(
      path.join(ROOT, 'lib/layers/UniversalLayerBootstrap.js'),
      'utf8',
    );
    assert.ok(boot.includes('armIncompleteInterviewCompensation'));
    assert.ok(boot.includes('P2574'));
    const detect = fs.readFileSync(
      path.join(ROOT, 'lib/protocol/IntelligentProtocolDetect.js'),
      'utf8',
    );
    assert.ok(detect.includes('ef00_only_mfr_incomplete_interview'));
    assert.ok(detect.includes('preserve_forced_pure') || detect.includes('_forcePureTuyaDp'));
  });
});
