'use strict';

/**
 * P2656 — Contre quoi: OSS LAN enrich must stay complementary
 * (gateway categories UNION, node_id-first cid, gwID hub options,
 * path doctrine, catalog peers, no invent pid).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2656 OSS LAN Tuya complementary enrich', () => {
  it('SSOT lists TinyTuya + tuyapi + HA localtuya + tuya-mqtt + Z2M path', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/oss-lan-tuya-enrich-ssot.json'), 'utf8'),
    );
    assert.equal(ssot._meta.id, 'P2656-oss-lan-tuya-enrich');
    assert.equal(ssot.mandate.unionNotReplace, true);
    assert.equal(ssot.mandate.noInventPid, true);
    const ids = (ssot.sourcesInvestigated || []).map((s) => s.id);
    for (const id of [
      'tinytuya',
      'tuyapi',
      'tuyapi-cli',
      'ha-tuya-local',
      'hass-localtuya-xzet',
      'tuya-mqtt-lehan',
      'tuya-local-key-vineet',
      'tuyadump',
      'gotuya',
      'zigbee2mqtt-zha-path',
      'com-tuyalocal',
    ]) {
      assert.ok(ids.includes(id), `missing source ${id}`);
    }
  });

  it('TuyaZigbeeBridge prefers node_id, keeps category UNION, sets gwID', () => {
    const Bridge = require('../../lib/tuya-local/TuyaZigbeeBridge');
    assert.ok(Bridge.GATEWAY_CATEGORIES.includes('wg'));
    assert.ok(Bridge.GATEWAY_CATEGORIES.includes('wg2'));
    assert.ok(Bridge.GATEWAY_CATEGORIES.length >= 8);
    assert.equal(
      Bridge.resolveSubDeviceCid({ id: 'cloud-id', uuid: 'u1', node_id: 'n1' }),
      'n1',
    );
    assert.equal(Bridge.resolveSubDeviceCid({ id: 'cloud-id', uuid: 'u1' }), 'u1');

    const opts = Bridge.buildGatewayTuyApiOptions({
      gatewayId: 'gw1',
      gatewayKey: 'abcdefghijklmnop',
      gatewayIp: '192.168.1.10',
      protocolVersion: '3.4',
    });
    assert.equal(opts.id, 'gw1');
    assert.equal(opts.gwID, 'gw1');
    assert.equal(opts.key, 'abcdefghijklmnop');
    assert.equal(opts.version, '3.4');
    assert.equal(opts.issueRefreshOnConnect, true);

    assert.ok(Bridge.CONTROL_PATH_DOCTRINE.zigbeeEndDeviceHomey);
    assert.ok(/no local_key/i.test(Bridge.CONTROL_PATH_DOCTRINE.zigbeeEndDeviceHomey));
    assert.ok(Bridge.CONTROL_PATH_DOCTRINE.wifiLan);
    assert.ok(Bridge.CONTROL_PATH_DOCTRINE.zigbeeBehindTuyaHub);

    const cloud = [
      { id: 'gw1', ip: '192.168.1.10', category: 'wg2', local_key: 'abcdefghijklmnop', name: 'Hub' },
      { id: 'child1', node_id: 'aabb', parent_id: 'gw1', name: 'TRV', category: 'wk' },
      { id: 'wifi1', ip: '192.168.1.11', category: 'cz', name: 'Plug' },
    ];
    const gws = Bridge.identifyGateways(cloud);
    assert.ok(gws.some((g) => g.id === 'gw1'));
    const sub = Bridge.identifySubDevices(cloud, 'gw1');
    assert.equal(sub.gateway.id, 'gw1');
    assert.equal(sub.subDevices.length, 1);
    assert.equal(sub.subDevices[0].cid, 'aabb');
  });

  it('WifiFixIt notes mention UDP 7000, hub Zigbee, and no-key Zigbee path', () => {
    const { LAN_LIMITATION_NOTES } = require('../../lib/wifi/WifiFixIt');
    assert.ok(Array.isArray(LAN_LIMITATION_NOTES) && LAN_LIMITATION_NOTES.length >= 6);
    assert.ok(LAN_LIMITATION_NOTES.some((n) => /7000/.test(n)));
    assert.ok(LAN_LIMITATION_NOTES.some((n) => /node_id|coordinator/i.test(n)));
    assert.ok(LAN_LIMITATION_NOTES.some((n) => /deep sleep/i.test(n)));
    assert.ok(LAN_LIMITATION_NOTES.some((n) => /no local_key/i.test(n)));
    assert.ok(LAN_LIMITATION_NOTES.some((n) => /wizard|QR|Cloud Lookup/i.test(n)));
  });

  it('SourceCredits + dual-app + human doc present', () => {
    const credits = require('../../lib/data/SourceCredits');
    assert.ok(credits.SOURCES.TINYTUYA);
    assert.ok(credits.SOURCES.TUYAPI);
    assert.ok(credits.SOURCES.TUYAPI_CLI);
    assert.ok(credits.SOURCES.TUYADUMP);
    assert.ok(credits.SOURCES.GOTUYA);
    assert.ok(credits.SOURCES.HASS_LOCALTUYA_XZET);
    assert.ok(credits.SOURCES.TUYA_MQTT_LEHAN);
    assert.ok(credits.SOURCES.TUYA_LOCAL_KEY_VINEET);
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/OSS_LAN_TUYA_ENRICH.md')));
    const tracks = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'),
    );
    assert.equal(tracks.domains.p2656_oss_lan_tuya_enrich.tag, 'MASTER_ONLY');
  });
});
