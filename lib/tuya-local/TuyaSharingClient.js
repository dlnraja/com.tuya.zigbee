'use strict';

/**
 * TuyaSharingClient.js — Smart Life / Tuya Smart "User Code + QR" account link.
 *
 * WHY: The Smart Life / Tuya Smart apps expose a sharing login used by the official
 * Home Assistant Tuya integration and by make-all/tuya-local. It needs NO Tuya IoT
 * developer project: the user types the "User Code" shown in the app
 * (Me → Settings → Account and Security → User Code), scans one QR code, and the
 * cloud returns every device of the account WITH its local_key. Homey then talks
 * to the devices over LAN only (local-first); cloud is used once for keys.
 *
 * Port (JavaScript reimplementation) of tuya/tuya-device-sharing-sdk
 *   https://github.com/tuya/tuya-device-sharing-sdk — MIT License, Copyright (c) 2023 Tuya
 *   (LoginControl + CustomerApi request signing / AES-GCM envelope).
 * Public client id + schema as used by Home Assistant core (Apache-2.0) and
 * make-all/tuya-local (MIT): HA_3y9q4ak7g4ephrvke / haauthorize.
 *
 * Security: tokens/local keys are NEVER logged here. Callers persist the session in
 * Homey app settings only (never in repo / CI). Transport is injectable so CI tests
 * never touch a real Tuya account.
 */

const crypto = require('crypto');
const https = require('https');
const { normalizeLocalKey } = require('./UdpDiscoveryKeys');

const SHARING_LOGIN_HOST = 'apigw.iotbing.com';
const SHARING_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
const SHARING_SCHEMA = 'haauthorize';
const NONCE_CHARS = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
const DEFAULT_TIMEOUT_MS = 15000;

/** QR payload the Smart Life / Tuya Smart app scanner understands. */
function buildQrContent(qrToken) {
  return `tuyaSmart--qrLogin?token=${qrToken}`;
}

function randomNonce(len = 12, rnd = crypto.randomInt) {
  let out = '';
  for (let i = 0; i < len; i++) {out += NONCE_CHARS[rnd(0, NONCE_CHARS.length)];}
  return out;
}

/** HMAC-SHA256(key=rid, msg=hashKey[_ecode]) hex, first 16 chars (SDK _secret_generating). */
function secretGenerating(rid, sid, hashKey) {
  let message = hashKey;
  const mod = 16;
  if (sid) {
    const length = Math.min(sid.length, mod);
    let ecode = '';
    for (let i = 0; i < length; i++) {
      const idx = sid.charCodeAt(i) % mod;
      ecode += sid[idx] || '';
    }
    message += `_${ecode}`;
  }
  return crypto.createHmac('sha256', Buffer.from(rid, 'utf8')).update(Buffer.from(message, 'utf8')).digest('hex').slice(0, 16);
}

/** base64(nonce) + base64(ciphertext||tag) — SDK _aes_gcm_encrypt (AES-128-GCM, utf8 key). */
function aesGcmEncrypt(plain, secret, nonce = randomNonce(12)) {
  const iv = Buffer.from(nonce, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-gcm', Buffer.from(secret, 'utf8'), iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final(), cipher.getAuthTag()]);
  return iv.toString('base64') + ct.toString('base64');
}

/** SDK _aex_gcm_decrypt: base64 → nonce(12) | ciphertext | tag(16). */
function aesGcmDecrypt(b64, secret) {
  const raw = Buffer.from(String(b64), 'base64');
  if (raw.length < 12 + 16) {throw new Error('sharing payload too short');}
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const d = crypto.createDecipheriv('aes-128-gcm', Buffer.from(secret, 'utf8'), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

/** SDK _restful_sign. */
function restfulSign(hashKey, queryEnc, bodyEnc, headers) {
  const parts = [];
  for (const k of ['X-appKey', 'X-requestId', 'X-sid', 'X-time', 'X-token']) {
    const v = headers[k];
    if (v !== undefined && v !== null && v !== '') {parts.push(`${k}=${v}`);}
  }
  let s = parts.join('||');
  if (queryEnc) {s += queryEnc;}
  if (bodyEnc) {s += bodyEnc;}
  return crypto.createHmac('sha256', Buffer.from(hashKey, 'utf8')).update(Buffer.from(s, 'utf8')).digest('hex');
}

/** Compact JSON like python json.dumps(separators=(",", ":")). */
function formToJson(obj) {
  return JSON.stringify(obj);
}

/** Default HTTPS transport → resolves { status, json }. Never rejects. */
function defaultTransport({ method, url, headers, body, timeoutMs }) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (e) { resolve({ status: 0, json: { success: false, msg: 'Bad URL' } }); return; }
    const req = https.request({
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', ...headers || {} },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, json: { success: false, msg: `HTTP ${res.statusCode} (non-JSON)` } }); }
      });
    });
    req.on('error', (err) => resolve({ status: 0, json: { success: false, msg: err.message } }));
    req.setTimeout(timeoutMs || DEFAULT_TIMEOUT_MS, () => { req.destroy(); resolve({ status: 0, json: { success: false, msg: 'Timeout' } }); });
    if (body) {req.write(body);}
    req.end();
  });
}

/** Human message for common sharing error codes (graceful UI errors). */
function describeSharingError(res) {
  const code = res && (res.code ?? res.errorCode);
  const msg = (res && (res.msg || res.errorMsg)) || '';
  if (String(code) === '1010' || /token invalid|expired/i.test(msg)) {return 'Tuya session expired — scan the QR code again.';}
  if (/user ?code/i.test(msg)) {return 'Invalid User Code. In Smart Life / Tuya Smart: Me → Settings → Account and Security → User Code.';}
  return msg || (code ? `Tuya sharing error ${code}` : 'Tuya sharing request failed');
}

class TuyaSharingLogin {
  constructor({ clientId = SHARING_CLIENT_ID, schema = SHARING_SCHEMA, transport = defaultTransport, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.clientId = clientId;
    this.schema = schema;
    this.transport = transport;
    this.timeoutMs = timeoutMs;
  }

  /** @returns {Promise<{success:boolean, qrToken?:string, qrContent?:string, error?:string}>} */
  async requestQrCode(userCode) {
    const uc = String(userCode || '').trim();
    if (!uc) {return { success: false, error: 'User Code required (Smart Life / Tuya Smart app: Me → Settings → Account and Security → User Code).' };}
    const q = new URLSearchParams({ clientid: this.clientId, usercode: uc, schema: this.schema });
    const { json } = await this.transport({ method: 'POST', url: `https://${SHARING_LOGIN_HOST}/v1.0/m/life/home-assistant/qrcode/tokens?${q}`, headers: {}, body: null, timeoutMs: this.timeoutMs });
    if (json && json.success && json.result && json.result.qrcode) {
      return { success: true, qrToken: json.result.qrcode, qrContent: buildQrContent(json.result.qrcode), userCode: uc };
    }
    return { success: false, error: describeSharingError(json), code: json && json.code };
  }

  /** One poll. @returns {Promise<{success:boolean, pending?:boolean, session?:object, error?:string}>} */
  async pollLogin(qrToken, userCode) {
    const q = new URLSearchParams({ clientid: this.clientId, usercode: String(userCode || '').trim() });
    const { json } = await this.transport({ method: 'GET', url: `https://${SHARING_LOGIN_HOST}/v1.0/m/life/home-assistant/qrcode/tokens/${encodeURIComponent(qrToken)}?${q}`, headers: {}, body: null, timeoutMs: this.timeoutMs });
    if (json && json.success && json.result && json.result.access_token) {
      const r = json.result;
      return {
        success: true,
        session: {
          userCode: String(userCode).trim(),
          terminalId: r.terminal_id || '',
          endpoint: r.endpoint || '',
          username: r.username || '',
          tokenInfo: {
            t: Number(json.t) || Date.now(),
            uid: r.uid || '',
            expire_time: Number(r.expire_time) || 0,
            access_token: r.access_token,
            refresh_token: r.refresh_token || '',
          },
        },
      };
    }
    return { success: false, pending: true, error: describeSharingError(json) };
  }

  /** Poll until scanned or timeout. sleepFn injectable for tests. */
  async waitForLogin(qrToken, userCode, { maxWaitMs = 120000, intervalMs = 2500, sleepFn } = {}) {
    const sleep = sleepFn || ((ms) => new Promise((r) => { const t = setTimeout(r, ms); t.unref?.(); }));
    const start = Date.now();
    let last = { success: false, error: 'QR code scan timeout' };
    while (Date.now() - start < maxWaitMs) {
      last = await this.pollLogin(qrToken, userCode);
      if (last.success) {return last;}
      await sleep(intervalMs);
    }
    return { success: false, error: 'QR code scan timeout — scan with the Smart Life / Tuya Smart app and confirm.', lastError: last.error };
  }
}

class TuyaSharingCustomerApi {
  /**
   * @param {object} session { userCode, terminalId, endpoint, tokenInfo{t,uid,expire_time,access_token,refresh_token} }
   * @param {object} [opts] { clientId, transport, onTokenUpdate(session) }
   */
  constructor(session, opts = {}) {
    if (!session || !session.endpoint || !session.tokenInfo) {throw new Error('Invalid Tuya sharing session');}
    this.session = JSON.parse(JSON.stringify(session));
    this.clientId = opts.clientId || SHARING_CLIENT_ID;
    this.transport = opts.transport || defaultTransport;
    this.onTokenUpdate = typeof opts.onTokenUpdate === 'function' ? opts.onTokenUpdate : null;
    this.timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    this._refreshing = false;
    this._now = opts.now || (() => Date.now());
  }

  get expiresAt() {
    const ti = this.session.tokenInfo;
    return (Number(ti.t) || 0) + ((Number(ti.expire_time) || 0) * 1000);
  }

  async _refreshIfNeeded() {
    if (this._refreshing) {return;}
    if (this.expiresAt - 60000 > this._now()) {return;}
    this._refreshing = true;
    try {
      const res = await this._request('GET', `/v1.0/m/token/${this.session.tokenInfo.refresh_token}`, null, null, true);
      if (res && res.success && res.result) {
        const r = res.result;
        this.session.tokenInfo = {
          t: Number(res.t) || this._now(),
          expire_time: Number(r.expireTime) || 0,
          uid: r.uid || this.session.tokenInfo.uid,
          access_token: r.accessToken,
          refresh_token: r.refreshToken,
        };
        if (this.onTokenUpdate) {
          try { await this.onTokenUpdate(this.session); } catch (_e) { /* persist best-effort */ }
        }
      }
    } catch (_e) { /* keep old token; request will surface the error */ }
    finally { this._refreshing = false; }
  }

  async get(path, params) { return this._request('GET', path, params, null); }
  async post(path, params, body) { return this._request('POST', path, params, body); }

  async _request(method, path, params, body, skipRefresh = false) {
    if (!skipRefresh) {await this._refreshIfNeeded();}
    const rid = crypto.randomUUID();
    const sid = '';
    const hashKey = crypto.createHash('md5').update(rid + (this.session.tokenInfo.refresh_token || ''), 'utf8').digest('hex');
    const secret = secretGenerating(rid, sid, hashKey);

    let queryEnc = '';
    let url = this.session.endpoint.replace(/\/$/, '') + path;
    if (params && Object.keys(params).length) {
      queryEnc = aesGcmEncrypt(formToJson(params), secret);
      url += `?${new URLSearchParams({ encdata: queryEnc })}`;
    }
    let bodyEnc = '';
    let bodyStr = null;
    if (body && Object.keys(body).length) {
      bodyEnc = aesGcmEncrypt(formToJson(body), secret);
      bodyStr = JSON.stringify({ encdata: bodyEnc });
    }
    const headers = {
      'X-appKey': this.clientId,
      'X-requestId': rid,
      'X-sid': sid,
      'X-time': String(this._now()),
    };
    if (this.session.tokenInfo.access_token) {headers['X-token'] = this.session.tokenInfo.access_token;}
    headers['X-sign'] = restfulSign(hashKey, queryEnc, bodyEnc, headers);

    const { status, json } = await this.transport({ method, url, headers, body: bodyStr, timeoutMs: this.timeoutMs });
    if (!json || json.success !== true) {
      return { success: false, status, code: json && json.code, msg: describeSharingError(json) };
    }
    if (json.result) {
      try {
        const plain = aesGcmDecrypt(json.result, secret);
        try { json.result = JSON.parse(plain); } catch { json.result = plain; }
      } catch (e) {
        return { success: false, status, msg: `Cannot decrypt Tuya sharing response: ${e.message}` };
      }
    }
    return json;
  }

  async listHomes() {
    const res = await this.get('/v1.0/m/life/users/homes');
    if (!res.success) {return { success: false, error: res.msg, homes: [] };}
    const list = Array.isArray(res.result) ? res.result : [];
    return { success: true, homes: list.map((h) => ({ id: String(h.ownerId ?? h.homeId ?? h.id ?? ''), name: h.name || '' })).filter((h) => h.id) };
  }

  /** All devices of all homes, normalized (same shape as TuyaSmartLifeAuth._normalizeDevice). */
  async listDevicesWithLocalKeys() {
    const homes = await this.listHomes();
    if (!homes.success) {return { success: false, error: homes.error || 'Cannot list homes', devices: [] };}
    const byId = new Map();
    const errors = [];
    for (const home of homes.homes) {
      const res = await this.get('/v1.0/m/life/ha/home/devices', { homeId: home.id });
      if (!res.success) { errors.push(res.msg); continue; }
      for (const d of Array.isArray(res.result) ? res.result : []) {
        const n = normalizeSharingDevice(d, home);
        if (n.id) {byId.set(n.id, n);}
      }
    }
    const devices = [...byId.values()];
    if (!devices.length && errors.length) {return { success: false, error: errors[0], devices: [] };}
    return { success: true, devices, withKeys: devices.filter((d) => d.local_key).length };
  }
}

function normalizeSharingDevice(d, home = {}) {
  const rawKey = d.local_key || d.localKey || '';
  return {
    id: d.id || d.devId || '',
    name: d.name || d.product_name || 'Tuya device',
    local_key: normalizeLocalKey(rawKey) || rawKey || '',
    category: d.category || '',
    product_id: d.product_id || d.productId || '',
    product_name: d.product_name || d.productName || '',
    ip: d.ip || '',
    online: !!d.online,
    node_id: d.node_id || '',
    uuid: d.uuid || '',
    uid: d.uid || '',
    sub: d.sub === true,
    support_local: d.support_local !== false,
    gateway_id: d.gateway_id || '',
    home_id: home.id || '',
    home_name: home.name || '',
    source: 'smartlife_sharing',
  };
}

/** Strip secrets before any log / UI echo. */
function redactSession(session) {
  if (!session) {return null;}
  return {
    endpoint: session.endpoint,
    terminalId: session.terminalId ? `${String(session.terminalId).slice(0, 4)}…` : '',
    uid: session.tokenInfo && session.tokenInfo.uid ? `${String(session.tokenInfo.uid).slice(0, 4)}…` : '',
    hasToken: !!(session.tokenInfo && session.tokenInfo.access_token),
  };
}

module.exports = {
  SHARING_LOGIN_HOST,
  SHARING_CLIENT_ID,
  SHARING_SCHEMA,
  TuyaSharingLogin,
  TuyaSharingCustomerApi,
  buildQrContent,
  secretGenerating,
  aesGcmEncrypt,
  aesGcmDecrypt,
  restfulSign,
  randomNonce,
  normalizeSharingDevice,
  describeSharingError,
  redactSession,
  defaultTransport,
};
