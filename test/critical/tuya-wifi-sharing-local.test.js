'use strict';

/**
 * Tuya Wi-Fi local-first: Smart Life sharing login (User Code + QR), OpenAPI signing fixes,
 * 3.5 discovery retcode tolerance, white-label catalog, pair UI non-blocking manual path.
 * No network: every cloud call goes through an in-memory mock transport.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const S = require('../../lib/tuya-local/TuyaSharingClient');
const TuyaSmartLifeAuth = require('../../lib/tuya-local/TuyaSmartLifeAuth');
const TuyaCloudAPI = require('../../lib/tuya-local/TuyaCloudAPI');
const K = require('../../lib/tuya-local/UdpDiscoveryKeys');
const WL = require('../../lib/tuya-local/TuyaWhiteLabelCatalog');
const { TUYA_SHARING_CLIENT_ID, TUYA_SHARING_SCHEMA } = require('../../lib/tuya-local/TuyaAuthCatalog');

const RID = '0f8fad5b-d9cb-469f-a165-70867728950e';

/** Fake Tuya sharing cloud: verifies X-sign, decrypts encdata, encrypts result. */
function makeFakeCloud({ refreshToken = 'rt-1', homes = [{ ownerId: 42, name: 'Home' }], devices = {} } = {}) {
  const calls = [];
  let currentRefresh = refreshToken;
  const transport = async ({ method, url, headers, body }) => {
    const u = new URL(url);
    calls.push({ method, path: u.pathname, headers, url });
    if (u.hostname === S.SHARING_LOGIN_HOST) {
      if (u.pathname.endsWith('/qrcode/tokens') && method === 'POST') {
        return { status: 200, json: { success: true, result: { qrcode: 'QRTOKEN' } } };
      }
      return { status: 200, json: { success: true, t: 1700000000000, result: { access_token: 'at-1', refresh_token: currentRefresh, uid: 'eu123', expire_time: 7200, terminal_id: 'term-1', endpoint: 'https://apigw.tuyaeu.com', username: 'x' } } };
    }
    const rid = headers['X-requestId'];
    const hashKey = crypto.createHash('md5').update(rid + currentRefresh).digest('hex');
    const secret = S.secretGenerating(rid, '', hashKey);
    const q = u.searchParams.get('encdata') || '';
    const b = body ? JSON.parse(body).encdata : '';
    const expected = S.restfulSign(hashKey, q, b, headers);
    if (expected !== headers['X-sign']) return { status: 200, json: { success: false, code: 1004, msg: 'sign invalid' } };
    const params = q ? JSON.parse(S.aesGcmDecrypt(q, secret)) : {};
    let result;
    if (u.pathname.startsWith('/v1.0/m/token/')) {
      currentRefresh = 'rt-2';
      return { status: 200, json: { success: true, t: Date.now(), result: S.aesGcmEncrypt(JSON.stringify({ expireTime: 7200, uid: 'eu123', accessToken: 'at-2', refreshToken: 'rt-2' }), secret) } };
    }
    if (u.pathname === '/v1.0/m/life/users/homes') result = homes;
    else if (u.pathname === '/v1.0/m/life/ha/home/devices') result = devices[params.homeId] || [];
    else return { status: 200, json: { success: false, code: 404, msg: 'unknown path' } };
    return { status: 200, json: { success: true, t: Date.now(), result: S.aesGcmEncrypt(JSON.stringify(result), secret) } };
  };
  return { transport, calls };
}

describe('TuyaSharingClient — parity with tuya-device-sharing-sdk (MIT)', () => {
  it('uses the Home Assistant public client id + haauthorize schema', () => {
    assert.equal(S.SHARING_CLIENT_ID, 'HA_3y9q4ak7g4ephrvke');
    assert.equal(TUYA_SHARING_CLIENT_ID, S.SHARING_CLIENT_ID);
    assert.equal(TUYA_SHARING_SCHEMA, 'haauthorize');
    assert.equal(S.buildQrContent('abc'), 'tuyaSmart--qrLogin?token=abc');
  });

  it('secret / sign / AES-GCM match vectors generated with the Python SDK', () => {
    const hk = crypto.createHash('md5').update(RID + 'refreshTOKEN123').digest('hex');
    assert.equal(hk, '3cd83ee04f0655cd00e79e1cfeee822d');
    assert.equal(S.secretGenerating(RID, '', hk), '0793e3bb14e286af');
    assert.equal(S.secretGenerating(RID, 'abcdefghijklmnopq', hk), '4192d526eb5f97d0');
    assert.equal(
      S.restfulSign(hk, 'QENC', 'BENC', { 'X-appKey': 'HA_3y9q4ak7g4ephrvke', 'X-requestId': RID, 'X-sid': '', 'X-time': '1700000000000', 'X-token': 'tok' }),
      '6a27730adea4e4ebb64f1d1d89efa840647d8ad820bfa6e99d444515365266d6',
    );
    const enc = 'QUJDREVGR0hKS01Ot4+4a3Y6lSiWNe1gaotlTL0Yh8FTc8sawgV2GRUD5mQ=';
    assert.equal(S.aesGcmEncrypt('{"homeId":"123"}', '0793e3bb14e286af', 'ABCDEFGHJKMN'), enc);
    assert.equal(S.aesGcmDecrypt(enc, '0793e3bb14e286af'), '{"homeId":"123"}');
  });

  it('requires a User Code and never calls the network without it', async () => {
    let called = false;
    const login = new S.TuyaSharingLogin({ transport: async () => { called = true; return { json: {} }; } });
    const r = await login.requestQrCode('  ');
    assert.equal(r.success, false);
    assert.match(r.error, /User Code/);
    assert.equal(called, false);
  });

  it('QR → poll → homes → devices with local_key (signed + encrypted roundtrip)', async () => {
    const fake = makeFakeCloud({ devices: { 42: [{ id: 'bf01', name: 'Plug', local_key: 'abcdefghijklmnop', category: 'cz', product_id: 'p1', ip: '1.2.3.4', online: true }] } });
    const login = new S.TuyaSharingLogin({ transport: fake.transport });
    const qr = await login.requestQrCode('UC123');
    assert.equal(qr.success, true);
    assert.equal(qr.qrContent, 'tuyaSmart--qrLogin?token=QRTOKEN');
    assert.match(fake.calls[0].url, /clientid=HA_3y9q4ak7g4ephrvke&usercode=UC123&schema=haauthorize/);
    const polled = await login.waitForLogin(qr.qrToken, 'UC123', { maxWaitMs: 1000, sleepFn: async () => {} });
    assert.equal(polled.success, true);
    assert.equal(polled.session.endpoint, 'https://apigw.tuyaeu.com');
    const api = new S.TuyaSharingCustomerApi(polled.session, { transport: fake.transport, now: () => 1700000000000 });
    const res = await api.listDevicesWithLocalKeys();
    assert.equal(res.success, true, res.error);
    assert.equal(res.devices.length, 1);
    assert.equal(res.devices[0].local_key, 'abcdefghijklmnop');
    assert.equal(res.devices[0].home_id, '42');
  });

  it('refreshes an expired token and reports it through onTokenUpdate', async () => {
    const fake = makeFakeCloud();
    const session = { userCode: 'UC', terminalId: 't', endpoint: 'https://apigw.tuyaeu.com', tokenInfo: { t: 0, expire_time: 1, access_token: 'old', refresh_token: 'rt-1', uid: 'u' } };
    let updated = null;
    const api = new S.TuyaSharingCustomerApi(session, { transport: fake.transport, onTokenUpdate: (s) => { updated = s; } });
    const homes = await api.listHomes();
    assert.equal(homes.success, true);
    assert.ok(updated);
    assert.equal(updated.tokenInfo.access_token, 'at-2');
    assert.ok(fake.calls.some((c) => c.path.startsWith('/v1.0/m/token/')));
  });

  it('redactSession never exposes tokens', () => {
    const red = JSON.stringify(S.redactSession({ endpoint: 'e', terminalId: 'terminal', tokenInfo: { access_token: 'SECRET_AT', refresh_token: 'SECRET_RT', uid: 'uid123' } }));
    assert.ok(!red.includes('SECRET'));
  });
});

describe('TuyaSmartLifeAuth sharing integration', () => {
  it('User Code switches to sharing mode and lists devices with keys', async () => {
    const fake = makeFakeCloud({ devices: { 42: [{ id: 'bf02', local_key: '0123456789abcdef0123456789abcdef', name: 'Bulb' }] } });
    const auth = new TuyaSmartLifeAuth({ transport: fake.transport });
    const qr = await auth.getQRCodeWithRegionFallback('UC9', 'smartlife');
    assert.equal(qr.success, true);
    assert.equal(qr.mode, 'sharing');
    const p = await auth.pollQRLogin(1000);
    assert.equal(p.success, true);
    const d = await auth.getDevicesWithLocalKeys();
    assert.equal(d.success, true);
    assert.equal(d.devices[0].id, 'bf02');
    assert.equal(Buffer.from(d.devices[0].local_key, 'latin1').length, 16); // 32-hex normalized
  });

  it('fromSharingSession restores a session without QR', () => {
    const a = TuyaSmartLifeAuth.fromSharingSession({ endpoint: 'https://x', terminalId: 't', tokenInfo: { access_token: 'a', refresh_token: 'r', uid: 'u' } });
    assert.equal(a._mode, 'sharing');
    assert.equal(a.tokenInfo.access_token, 'a');
  });

  it('IoT signed requests sort query keys (Tuya OpenAPI requirement)', async () => {
    const auth = new TuyaSmartLifeAuth({});
    auth.accessId = 'id'; auth.accessKey = 'key'; auth.tokenInfo = { access_token: 'tok' };
    let seen = null;
    auth._signedRequest = async (m, fullPath) => { seen = fullPath; return { success: true, result: {} }; };
    await auth._authenticatedRequest('GET', '/v1.0/iot-03/devices', { source_type: 'tuyaUser', source_id: 'u', page_size: '50' });
    assert.equal(seen, '/v1.0/iot-03/devices?page_size=50&source_id=u&source_type=tuyaUser');
  });
});

describe('TuyaCloudAPI signing', () => {
  it('stringToSign has an empty optional-headers line (tuya-connector-nodejs parity)', () => {
    const api = new TuyaCloudAPI({ accessId: 'AID', accessKey: 'SECRET', region: 'eu' });
    const origUUID = crypto.randomUUID;
    crypto.randomUUID = () => 'nonce-1';
    try {
      const { sign } = api._sign('GET', '/v1.0/token', { grant_type: 1 }, null, '1700000000000');
      const hash = crypto.createHash('sha256').update('').digest('hex');
      const sts = `GET\n${hash}\n\n/v1.0/token?grant_type=1`;
      const expected = crypto.createHmac('sha256', 'SECRET').update('AID' + '' + '1700000000000' + 'nonce-1' + sts).digest('hex').toUpperCase();
      assert.equal(sign, expected);
    } finally { crypto.randomUUID = origUUID; }
  });
});

describe('UDP discovery 3.5 retcode tolerance', () => {
  it('decodes a 6699 frame whose payload starts with a non-zero 4-byte retcode', () => {
    const payload = Buffer.concat([Buffer.from([0, 0, 0, 0x41]), Buffer.from('{"gwId":"bf99","ip":"10.0.0.9","version":"3.5"}')]);
    const iv = crypto.randomBytes(12);
    const header = Buffer.alloc(18);
    header.writeUInt32BE(0x6699, 0); header.writeUInt16BE(0, 4); header.writeUInt32BE(1, 6); header.writeUInt32BE(0x13, 10);
    header.writeUInt32BE(12 + payload.length + 16, 14);
    const c = crypto.createCipheriv('aes-128-gcm', K.UDP_KEY_GCM, iv);
    c.setAAD(header.subarray(4));
    const ct = Buffer.concat([c.update(payload), c.final()]);
    const frame = Buffer.concat([header, iv, ct, c.getAuthTag(), K.SUFFIX_6699]);
    const r = K.decryptUdpDiscoveryMessage(frame);
    assert.ok(r);
    assert.equal(r.frame, '6699');
    assert.equal(JSON.parse(r.payload).gwId, 'bf99');
  });
});

describe('White-label catalog + pair UI', () => {
  it('maps Lidl / Moes / Nedis to move-to-Smart-Life advice and Smart Life to sharing QR', () => {
    for (const b of ['Lidl Home', 'moes', 'Nedis', 'gosund', 'avatto']) assert.ok(WL.normalizeBrand(b), b);
    assert.equal(WL.keyRetrievalAdvice('Lidl Home').steps[0].strategy, 'move_to_smartlife');
    assert.equal(WL.keyRetrievalAdvice('Smart Life').nativeSharing, true);
  });

  it('pair UI: user code field, explicit manual add (non-blocking), Homey.showView', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../drivers/wifi_generic/pair/configure.html'), 'utf8');
    assert.ok(html.includes('id="sl_uc"'));
    assert.ok(html.includes('id="m_force"'));
    assert.ok(html.includes('doManual()'));
    assert.ok(html.includes("H.showView('list_devices')"));
    assert.ok(!/[^.]showView\('list_devices'\)\}catch/.test(html.replace("H.showView('list_devices')", '')));
  });

  it('driver never returns the saved Access Secret or local keys to webviews', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
    assert.ok(!/accessSecret:\s*accessSecret\s*\|\|/.test(src));
    assert.ok(!/return \{ success: true, local_key: found\.local_key \}/.test(src));
    assert.ok(src.includes("data.force !== true"));
  });
});
