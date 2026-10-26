'use strict';
// P3065: qrcode (58 modules) is loaded on first QR pairing, not at app boot.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

test('P3065 TuyaLocalDriver does not require qrcode at module top level', () => {
  const src = fs.readFileSync(require.resolve('../../lib/tuya-local/TuyaLocalDriver'), 'utf8');
  assert.ok(!/^const QRCode = require\('qrcode'\);/m.test(src));
  assert.ok(src.includes("(_qrcode || (_qrcode = require('qrcode'))).toDataURL"));
});

test('P3065 lazy QRCode shim still produces a data URL', async () => {
  let _qrcode = null;
  const QRCode = { toDataURL: (...a) => (_qrcode || (_qrcode = require('qrcode'))).toDataURL(...a) };
  const url = await QRCode.toDataURL('tuyaSmart--qrLogin?token=x', { margin: 1, scale: 5 });
  assert.ok(url.startsWith('data:image/png;base64,'));
});
