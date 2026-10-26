'use strict';
// P3070: Wi-Fi pair/repair errors from TuyaLocalDriver / EweLinkLocalDriver were English-only.
// They now go through localMsg (errors.* keys, English fallback kept verbatim in code).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { localMsg } = require('../../lib/utils/LocalizedMessage');

const ROOT = path.resolve(__dirname, '../..');
const LOCALES = ['en', 'fr', 'de', 'nl', 'es', 'it', 'cs', 'da', 'no', 'sv', 'pl', 'pt', 'ru'];
const loc = (l) => JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', `${l}.json`), 'utf8')).errors;
const SRC = {
  'lib/tuya-local/TuyaLocalDriver.js': ['creds_required', 'lan_probe_creds', 'cloud_creds_settings',
    'cloud_creds_required', 'unsupported_mode', 'lan_probe_failed', 'nothing_to_update'],
  'lib/ewelink-local/EweLinkLocalDriver.js': ['device_id_required'],
};

describe('P3070 localized Wi-Fi pair/repair errors', () => {
  it('every key exists in all 13 locales and keeps its __reason__ token', () => {
    for (const keys of Object.values(SRC)) {
      for (const k of keys) {
        for (const l of LOCALES) {
          const v = loc(l)[k];
          assert.ok(typeof v === 'string' && v.trim(), `${l}.${k}`);
          assert.strictEqual(v.includes('__reason__'), loc('en')[k].includes('__reason__'), `${l}.${k} token`);
        }
      }
    }
  });

  it('code calls localMsg with the English locale text as fallback', () => {
    const en = loc('en');
    for (const [file, keys] of Object.entries(SRC)) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const k of keys) {
        const m = src.match(new RegExp(`localMsg\\(this, '${k}', '((?:[^'\\\\]|\\\\.)*)'`));
        assert.ok(m, `${file} ${k}`);
        assert.strictEqual(m[1], en[k], `${k} fallback`);
      }
    }
  });

  it('resolves French with the reason substituted, English when homey is missing', () => {
    const fr = loc('fr');
    const homey = { __: (p, v) => fr[p.split('.')[1]].replace('__reason__', v && v.reason) };
    assert.ok(localMsg({ homey }, 'lan_probe_failed', 'x', { reason: 'timeout' }).includes('timeout'));
    assert.strictEqual(localMsg({ homey }, 'nothing_to_update', 'Nothing to update'), 'Rien à mettre à jour');
    assert.strictEqual(localMsg(undefined, 'nothing_to_update', 'Nothing to update'), 'Nothing to update');
  });
});
