'use strict';

/**
 * P3070 — setUnavailable() status texts go through locales (errors.*) with an English fallback.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const { localMsg } = require('../../lib/utils/LocalizedMessage');

const ROOT = path.join(__dirname, '..', '..');
const KEYS = ['unreachable', 'phantom', 'local_creds_missing', 'local_creds_partial', 'local_client',
  'battery_sleep_silent', 'disconnected', 'local_unreachable_retry', 'no_messages_timeout', 'comm_error',
  'missing_device_id', 'connection_failed', 'no_ip',
  // P3070 batch 2: TuyaLocalDevice setWarning() texts
  'local_auth_cloud_recovery', 'local_auth_local_first', 'local_reconnecting', 'discovery_timeout',
  'local_unreachable_cloud_ok', 'local_key_recovered_link', 'local_key_recovered', 'auto_recovery_failed'];

describe('P3070 localized status messages', () => {
  it('uses homey.__ when the key exists and fills __tokens__', () => {
    const dev = { homey: { __: (k, v) => k === 'errors.comm_error' ? `Erreur : ${v.reason}` : k } };
    assert.strictEqual(localMsg(dev, 'comm_error', 'Communication error: __reason__', { reason: 'x' }), 'Erreur : x');
  });

  it('falls back to English when homey, the key or the locale is missing, or __ throws', () => {
    assert.strictEqual(localMsg(null, 'unreachable', 'Device not reachable'), 'Device not reachable');
    assert.strictEqual(localMsg({ homey: { __: (k) => k } }, 'nope', 'Fallback'), 'Fallback');
    assert.strictEqual(localMsg({ homey: { __: () => { throw new Error('boom'); } } }, 'a', 'B __r__', { r: 1 }), 'B 1');
    assert.strictEqual(localMsg({ homey: { __: () => undefined } }, 'a', 'C'), 'C');
  });

  it('every key exists in en/fr/de/nl/es/it with the same tokens', () => {
    for (const l of ['en', 'fr', 'de', 'nl', 'es', 'it']) {
      const e = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', `${l}.json`), 'utf8')).errors || {};
      for (const k of KEYS) {
        assert.ok(typeof e[k] === 'string' && e[k].trim(), `${l}.errors.${k}`);
        const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'en.json'), 'utf8')).errors[k];
        assert.deepStrictEqual(e[k].match(/__\w+__/g) || [], en.match(/__\w+__/g) || [], `${l}.${k} tokens`);
      }
    }
  });

  it('converted files no longer pass hard-coded literals to setUnavailable', () => {
    const files = ['lib/utils/ErrorClassifier.js', 'lib/tuya-local/TuyaLocalDevice.js',
      'lib/mixins/DeviceEnhancementsMixin.js', 'lib/devices/UnifiedCoverBase.js', 'lib/devices/UnifiedThermostatBase.js',
      'lib/devices/UnifiedSensorBase.js', 'lib/ewelink-local/EweLinkLocalDevice.js', 'app.js'];
    for (const f of files) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const code = src.replace(/\/\/.*$/gm, '');
      assert.ok(!/setUnavailable\(\s*(['"])[^'"\n]*\1\s*\)/.test(code), `${f}: quoted literal`);
      assert.ok(!/setUnavailable\(\s*`(?![^`]*localMsg)[^`]*`\s*\)/.test(code), `${f}: template literal`);
      assert.ok(src.includes("require('") && src.includes('localMsg'), f);
    }
  });

  it('TuyaLocalDevice no longer passes hard-coded literals to setWarning', () => {
    const code = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDevice.js'), 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/setWarning\(\s*(['"`])/.test(code), 'setWarning literal');
  });
});
