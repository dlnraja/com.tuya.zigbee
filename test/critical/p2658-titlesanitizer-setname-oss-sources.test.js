'use strict';

/**
 * P2658 — Contre quoi: TitleSanitizer must not call setName when missing;
 * OSS peers stay credited; source-workflow SSOT lists scanners.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2658 TitleSanitizer setName guard + OSS source credits', () => {
  it('autoSanitizeDeviceName skips when setName missing (diag 1e071a86)', async () => {
    const TitleSanitizer = require('../../lib/utils/TitleSanitizer');
    const device = {
      logs: [],
      getName: async () => 'Switch (Hybrid)',
      log(msg) { this.logs.push(String(msg)); },
      error() {},
    };
    const changed = await TitleSanitizer.autoSanitizeDeviceName(device);
    assert.equal(changed, false);
    assert.ok(device.logs.some((l) => /no setName/i.test(l)));
  });

  it('autoSanitizeDeviceName renames when setName exists', async () => {
    const TitleSanitizer = require('../../lib/utils/TitleSanitizer');
    let named = null;
    const device = {
      getName: async () => 'Plug (Hybrid)',
      setName: async (n) => { named = n; },
      log() {},
      error() {},
    };
    const changed = await TitleSanitizer.autoSanitizeDeviceName(device);
    assert.equal(changed, true);
    assert.ok(named && !/\(Hybrid\)/i.test(named));
  });

  it('CREDITS + SourceCredits list required OSS LAN peers', () => {
    const credits = fs.readFileSync(path.join(ROOT, 'docs/CREDITS.md'), 'utf8');
    for (const needle of [
      'TinyTuya',
      'TuyAPI',
      'tuya-local',
      'hass-localtuya',
      'localtuya',
      'tuya-mqtt',
      'tuyadump',
      'GoTuya',
      'tuya-local-key',
      'tuya-device-sharing-sdk',
      'Zigbee2MQTT',
    ]) {
      assert.ok(credits.includes(needle) || credits.toLowerCase().includes(needle.toLowerCase()), `CREDITS missing ${needle}`);
    }
    assert.ok(/Andi Wirz|Tuya Local/i.test(credits));

    const src = require('../../lib/data/SourceCredits');
    for (const key of [
      'TINYTUYA',
      'TUYAPI',
      'TUYAPI_CLI',
      'HA_TUYA_LOCAL',
      'HASS_LOCALTUYA_XZET',
      'LOCALTUYA_ROSPO',
      'TUYA_MQTT_LEHAN',
      'TUYADUMP',
      'GOTUYA',
      'TUYA_LOCAL_KEY_VINEET',
      'TUYA_DEVICE_SHARING_SDK',
      'ZIGBEE2MQTT',
    ]) {
      assert.ok(src.SOURCES[key], `SourceCredits missing ${key}`);
    }
  });

  it('OSS source workflow SSOT + yml exist', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/oss-lan-source-workflows-ssot.json'), 'utf8'),
    );
    assert.equal(ssot._meta.id, 'P2658-oss-lan-source-workflows');
    assert.ok(ssot.dataSources.some((s) => s.id === 'tinytuya'));
    assert.ok(ssot.dataSources.some((s) => s.id === 'ha-tuya-local'));
    assert.ok(fs.existsSync(path.join(ROOT, '.github/workflows/oss-lan-source-enrich.yml')));
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/oss-lan-source-enrich.yml'), 'utf8');
    assert.ok(yml.includes('tinytuya-scanner'));
    assert.ok(yml.includes('tuya-local-scanner'));
    assert.ok(yml.includes('probe:homey-peers'));
  });
});
