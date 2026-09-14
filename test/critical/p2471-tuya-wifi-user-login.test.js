'use strict';

/**
 * P2471 — WiFi Easy Login: authorized-login + auto-region + TuyaUserLogin SSOT.
 * Contre quoi: iot-03/users/login only; country_code ignored; no region persist.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  buildLoginIdentity,
  guessCountryCodeFromRegion,
  resolveLoginRegions,
  buildAuthorizedLoginBody,
} = require(path.join(ROOT, 'lib/tuya-local/TuyaUserLogin.js'));

describe('P2471 Tuya WiFi user login', () => {
  it('buildLoginIdentity normalizes email and phone+CC', () => {
    const email = buildLoginIdentity({ email: 'User@Example.COM' });
    assert.equal(email.kind, 'email');
    assert.equal(email.username, 'user@example.com');

    const phone = buildLoginIdentity({ phone: '06 12 34 56 78', countryCode: '33', region: 'eu' });
    assert.equal(phone.kind, 'phone');
    assert.ok(phone.username.startsWith('33'));
    assert.equal(phone.countryCode, '33');
  });

  it('guessCountryCodeFromRegion and resolveLoginRegions auto-fallback', () => {
    assert.equal(guessCountryCodeFromRegion('us'), '1');
    assert.equal(guessCountryCodeFromRegion('cn'), '86');
    const regions = resolveLoginRegions('eu', { autoRegion: true });
    assert.equal(regions[0], 'eu');
    assert.ok(regions.includes('us'));
    assert.deepEqual(resolveLoginRegions('we', { autoRegion: false }), ['we']);
  });

  it('buildAuthorizedLoginBody includes country_code + schema', () => {
    const body = buildAuthorizedLoginBody({
      identity: buildLoginIdentity({ email: 'a@b.com', countryCode: '33' }),
      passwordHash: 'abc',
      schema: 'tuyaSmart',
      region: 'eu',
    });
    assert.equal(body.username, 'a@b.com');
    assert.equal(body.password, 'abc');
    assert.equal(String(body.country_code), '33');
    assert.ok(/tuyaSmart|smartlife/i.test(body.schema));
  });

  it('TuyaCloudAPI.login uses authorized-login path', () => {
    const api = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaCloudAPI.js'), 'utf8');
    assert.ok(api.includes('associated-users/actions/authorized-login'), 'authorized-login endpoint');
    assert.ok(api.includes('TuyaUserLogin'), 'uses TuyaUserLogin');
    assert.ok(api.includes('autoRegion'), 'autoRegion option');
  });

  it('TuyaLocalDriver mode simple persists region + passes schema/autoRegion', () => {
    const drv = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
    assert.ok(drv.includes("mode === 'simple'"), 'simple mode');
    assert.ok(drv.includes("settings.set('tuya_cloud_region'"), 'persist region');
    assert.ok(drv.includes('tuya_cloud_auto_region'), 'reads auto-region setting');
    assert.ok(drv.includes('schema: data.schema'), 'passes schema');
  });

  it('pair UI + settings expose auto-region + email/phone', () => {
    const html = fs.readFileSync(path.join(ROOT, 'drivers/wifi_generic/pair/configure.html'), 'utf8');
    assert.ok(html.includes('ez_auto_reg'), 'Easy Login auto-region');
    assert.ok(html.includes('ez_reg'), 'Easy Login region');
    assert.ok(html.includes('Email or phone'), 'email/phone label');
    assert.ok(html.includes('SmartLink QR'), 'SmartLink tab');

    const settings = fs.readFileSync(path.join(ROOT, 'settings/index.html'), 'utf8');
    assert.ok(settings.includes('auto-reg'), 'settings auto-reg checkbox');
    assert.ok(settings.includes('tuya_cloud_auto_region'), 'persist auto region');
  });
});
