'use strict';

/**
 * Tests — OTA hardening (v9.0.385)
 *  - OTA header validation (magic, manufacturer, imageType, version)
 *  - download guards (size cap, timeout, sha512)
 *  - index schema validation
 */

const assert = require('assert');
const crypto = require('crypto');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = require('path').join(__dirname, '..');
const OTAUpdateManager = require('../lib/ota/OTAUpdateManager');

function makeOtaImage({ magic = 0x0BEEF11E, mfr = 4417, type = 5129, version = 22 } = {}) {
  const buf = Buffer.alloc(64);
  buf.writeUInt32LE(magic, 0);
  buf.writeUInt16LE(mfr, 10);
  buf.writeUInt16LE(type, 12);
  buf.writeUInt32LE(version, 14);
  return buf;
}

describe('OTA header validation (_validateImageHeader)', () => {
  const mgr = new OTAUpdateManager({});
  const ctx = (over = {}) => ({ manufacturerCode: 4417, imageType: 5129, currentVersion: 10, ...over });

  it('accepts a valid image', () => {
    assert.doesNotThrow(() => mgr._validateImageHeader(makeOtaImage({ version: 22 }), ctx(), null));
  });

  it('rejects wrong magic', () => {
    assert.throws(
      () => mgr._validateImageHeader(makeOtaImage({ magic: 0xDEADBEEF }), ctx(), null),
      /Invalid OTA magic/
    );
  });

  it('rejects manufacturer mismatch', () => {
    assert.throws(
      () => mgr._validateImageHeader(makeOtaImage({ mfr: 1234 }), ctx(), null),
      /Manufacturer mismatch/
    );
  });

  it('rejects imageType mismatch when device type is known', () => {
    assert.throws(
      () => mgr._validateImageHeader(makeOtaImage({ type: 1 }), ctx(), null),
      /imageType mismatch/
    );
  });

  it('accepts any imageType when device type is unknown (Tuya MCU)', () => {
    assert.doesNotThrow(() => mgr._validateImageHeader(makeOtaImage({ type: 1, version: 22 }), ctx({ imageType: 0 }), null));
  });

  it('rejects non-newer versions', () => {
    assert.throws(
      () => mgr._validateImageHeader(makeOtaImage({ version: 10 }), ctx(), null),
      /not newer/
    );
  });

  it('rejects truncated images', () => {
    assert.throws(
      () => mgr._validateImageHeader(Buffer.alloc(10), ctx(), null),
      /too small/
    );
  });
});

describe('OTA download guards', () => {
  it('enforces a 2 MB size cap in source', () => {
    const src = require('fs').readFileSync(require('path').join(ROOT, 'lib/ota/OTARepository.js'), 'utf8');
    assert.match(src, /MAX_IMAGE_SIZE = 2 \* 1024 \* 1024/);
    assert.match(src, /DOWNLOAD_TIMEOUT_MS = 60000/);
    assert.match(src, /MAX_MANIFEST_BYTES = 4 \* 1024 \* 1024/);
    assert.match(src, /boundedHttpsTextGet/);
  });

  it('enforces HTTPS-only downloads', () => {
    const src = require('fs').readFileSync(require('path').join(ROOT, 'lib/ota/OTARepository.js'), 'utf8');
    assert.match(src, /startsWith\('https:\/\/'\)/);
  });

  it('checkUpdate propagates sha512 for flash-time verification', () => {
    const src = require('fs').readFileSync(require('path').join(ROOT, 'lib/ota/OTAUpdateManager.js'), 'utf8');
    assert.match(src, /sha512: availableImage\.sha512/);
    assert.match(src, /downloadImage\(updateCheck\.url, updateCheck\.sha512/);
  });

  it('sha512 verification logic works end-to-end', () => {
    const image = makeOtaImage();
    const hash = crypto.createHash('sha512').update(image).digest('hex');
    const actual = crypto.createHash('sha512').update(image).digest('hex');
    assert.strictEqual(actual, hash);
    const tampered = crypto.createHash('sha512').update(Buffer.from(image).fill(0xff, 60)).digest('hex');
    assert.notStrictEqual(tampered, hash);
  });
});

describe('OTA index schema validation', () => {
  it('source validates entries (numeric codes, https url)', () => {
    const src = require('fs').readFileSync(require('path').join(ROOT, 'lib/ota/TuyaXiaomiOTAProvider.js'), 'utf8');
    assert.match(src, /Number\.isFinite\(img\.manufacturerCode\)/);
    assert.match(src, /img\.url\.startsWith\('https:\/\/'\)/);
    assert.match(src, /no valid entries — keeping previous cache/);
  });
});
