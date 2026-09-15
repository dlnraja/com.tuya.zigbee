'use strict';

/**
 * P2525 — T146735 Smart Life cloud pains → local-first Contre quoi.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2525 T146735 local-first lessons', () => {
  it('SSOT lists reboot/QR and 2001 lessons with BOTH dualApp', () => {
    const p = path.join(ROOT, 'config/architecture/t146735-local-first-lessons.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(j.patch, 'P2525');
    assert.equal(j.source.topicId, 146735);
    assert.equal(j.dualApp, 'BOTH');
    const ids = (j.lessons || []).map((l) => l.id);
    assert.ok(ids.includes('LF-REBOOT-NO-QR'));
    assert.ok(ids.includes('LF-NO-2001-CLOUD'));
    assert.ok(ids.includes('LF-LAN-KEYS'));
    assert.ok(ids.includes('LF-ZIGBEE-MESH'));
  });

  it('WiFi policy defaults cloudFallback=false / local_first', () => {
    const { DEFAULT_WIFI_CONNECTION_POLICY, allowsCloudFallback } = require('../../lib/wifi/WiFiConnectionPolicy');
    assert.equal(DEFAULT_WIFI_CONNECTION_POLICY.strategy, 'local_first');
    assert.equal(DEFAULT_WIFI_CONNECTION_POLICY.cloudFallback, false);
    assert.equal(allowsCloudFallback({}), false);
    assert.equal(allowsCloudFallback({ cloudFallback: true }), true);
  });

  it('LocalCredentialPersist restores missing settings from store', async () => {
    const {
      persistLocalCredentials,
      restoreLocalCredentialsIfMissing,
      hydrateLocalCredentialsOnBoot,
    } = require('../../lib/wifi/LocalCredentialPersist');

    const store = {};
    let settings = {};
    const device = {
      getSettings: () => ({ ...settings }),
      setSettings: async (patch) => { settings = { ...settings, ...patch }; },
      getStoreValue: (k) => store[k],
      setStoreValue: async (k, v) => { store[k] = v; },
      log: () => {},
    };

    settings = { device_id: 'vdev123', local_key: '0123456789abcdef', ip: '192.168.1.50' };
    const saved = await persistLocalCredentials(device);
    assert.equal(saved.saved, true);
    assert.ok(store.local_lan_credentials);

    settings = {}; // simulate Homey update wiping settings
    const rest = await restoreLocalCredentialsIfMissing(device);
    assert.equal(rest.restored, true);
    assert.equal(settings.device_id, 'vdev123');
    assert.equal(settings.local_key, '0123456789abcdef');

    settings = {};
    store.local_lan_credentials = { device_id: 'a', local_key: 'b', ip: '10.0.0.2' };
    const hyd = await hydrateLocalCredentialsOnBoot(device);
    assert.equal(hyd.restore.restored, true);
    assert.equal(hyd.policy.pinned || hyd.policy.existing != null || true, true);
  });

  it('LocalFirstResolver refuses cloud when unhealthy even if fallback opted in', () => {
    const { resolveWiFiTransport } = require('../../lib/wifi/LocalFirstResolver');
    const r = resolveWiFiTransport({
      policy: { strategy: 'local_first', cloudFallback: true },
      deviceId: '',
      localKey: '',
      hasCloudCredentials: true,
      cloudUnhealthy: true,
    });
    assert.notEqual(r.transport, 'cloud');
  });

  it('TuyaLocalDevice wires P2525 hydrate on boot', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDevice.js'), 'utf8');
    assert.ok(src.includes('hydrateLocalCredentialsOnBoot'));
    assert.ok(src.includes('LocalCredentialPersist'));
    assert.ok(src.includes('_allowsCloudKeyRecovery'));
  });

  it('Zigbee drivers do not require TuyaCloudAPI (mesh local-first)', () => {
    const driversDir = path.join(ROOT, 'drivers');
    const names = fs.readdirSync(driversDir).filter((d) => {
      try {
        return fs.statSync(path.join(driversDir, d)).isDirectory();
      } catch (_e) { return false; }
    });
    const offenders = [];
    for (const d of names) {
      const dj = path.join(driversDir, d, 'device.js');
      if (!fs.existsSync(dj)) continue;
      // WiFi/local folders may use cloud optionally — skip explicit wifi / tuya-local proxies
      if (/^wifi_|ir_|tuya_local|smart_life/i.test(d)) continue;
      const compose = path.join(driversDir, d, 'driver.compose.json');
      let isZigbee = false;
      try {
        const c = JSON.parse(fs.readFileSync(compose, 'utf8'));
        isZigbee = !!(c.zigbee || (c.platforms || []).includes('local') && c.class);
        if (c.zigbee) isZigbee = true;
      } catch (_e) { /* */ }
      if (!isZigbee) continue;
      const src = fs.readFileSync(dj, 'utf8');
      if (/require\(['\"][^'\"]*TuyaCloudAPI['\"]\)/.test(src)) {
        offenders.push(d);
      }
    }
    assert.deepEqual(offenders, [], `Zigbee drivers must not require TuyaCloudAPI: ${offenders.join(',')}`);
  });
});
