'use strict';

/**
 * P2476 — WiFi Easy Login email OR phone + SmartLink QR (not EZ SmartConfig).
 * Contre quoi: phone accounts rejected; UI still labeled SmartConfig-only.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { normalizeTuyaUsername } = require(path.join(ROOT, 'lib', 'tuya-local', 'normalizeTuyaUsername'));

const email = normalizeTuyaUsername('User@Example.COM');
assert.strictEqual(email.kind, 'email');
assert.strictEqual(email.username, 'user@example.com');

const phone = normalizeTuyaUsername('06 12 34 56 78', '33');
assert.strictEqual(phone.kind, 'phone');
assert.ok(phone.username.startsWith('33'), `expected 33 prefix, got ${phone.username}`);
assert.ok(phone.username.includes('612345678') || phone.username.endsWith('612345678'));

const intl = normalizeTuyaUsername('+33612345678', '33');
assert.strictEqual(intl.kind, 'phone');
assert.ok(intl.username.includes('33612345678') || intl.username === '33612345678');

const api = fs.readFileSync(path.join(ROOT, 'lib', 'tuya-local', 'TuyaCloudAPI.js'), 'utf8');
assert.ok(api.includes('normalizeTuyaUsername'), 'P2476: CloudAPI uses normalize');

const driver = fs.readFileSync(path.join(ROOT, 'lib', 'tuya-local', 'TuyaLocalDriver.js'), 'utf8');
assert.ok(driver.includes('countryCode'), 'P2476: pair login passes countryCode');
assert.ok(driver.includes('data.email || data.username'), 'P2476: username alias');

const html = fs.readFileSync(path.join(ROOT, 'drivers', 'wifi_generic', 'pair', 'configure.html'), 'utf8');
assert.ok(html.includes('SmartLink QR'), 'P2476: SmartLink QR tab');
assert.ok(html.includes('Email or phone'), 'P2476: email/phone field');
assert.ok(!/EZ SmartConfig/.test(html) || html.includes('Not EZ SmartConfig') || html.includes('not EZ'), 'P2476: not EZ SmartConfig framing');

const settings = fs.readFileSync(path.join(ROOT, 'settings', 'index.html'), 'utf8');
assert.ok(settings.includes('SmartLink'), 'P2476: settings SmartLink card');

console.log('P2476 WiFi phone + SmartLink: PASS');
