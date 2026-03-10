'use strict';

const crypto = require('crypto');
const https = require('https');

const REGIONS = {
  eu: 'openapi.tuyaeu.com',
  us: 'openapi.tuyaus.com',
  cn: 'openapi.tuyacn.com',
  in: 'openapi.tuyain.com',
};

const COUNTRY_TO_REGION = {
  1: 'us', 7: 'eu', 31: 'eu', 32: 'eu', 33: 'eu', 34: 'eu', 36: 'eu',
  39: 'eu', 41: 'eu', 43: 'eu', 44: 'eu', 45: 'eu', 46: 'eu', 47: 'eu',
  48: 'eu', 49: 'eu', 52: 'us', 55: 'us', 61: 'eu', 65: 'eu', 81: 'eu',
  82: 'eu', 86: 'cn', 90: 'eu', 91: 'in',
  351: 'eu', 352: 'eu', 353: 'eu', 358: 'eu', 372: 'eu', 380: 'eu',
  385: 'eu', 420: 'eu', 421: 'eu',
};

class TuyaCloudAPI {

  constructor(opts = {}) {
    this._accessId = opts.accessId || '';
    this._accessSecret = opts.accessSecret || '';
    this._region = (opts.region || 'eu').toLowerCase();
    this._host = REGIONS[this._region] || REGIONS.eu;
    this._token = null;
    this._tokenExpiry = 0;
    this._uid = opts.uid || null;
    this._log = opts.log || (() => {});
  }

  // ── Tuya Open API v2.0 HMAC-SHA256 signing ──

  _sign(method, path, body, timestamp, nonce, token) {
    const contentHash = crypto.createHash('sha256').update(body || '').digest('hex');
    const stringToSign = [method, contentHash, '', path].join('\n');
    const signStr = this._accessId + (token || '') + timestamp + nonce + stringToSign;
    return crypto.createHmac('sha256', this._accessSecret).update(signStr).digest('hex').toUpperCase();
  }

  _request(method, path, body) {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now().toString();
      const nonce = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const bodyStr = body ? JSON.stringify(body) : '';
      const sign = this._sign(method, path, bodyStr, timestamp, nonce, this._token);
      const headers = {
        'client_id': this._accessId,
        'sign': sign,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'nonce': nonce,
        'Content-Type': 'application/json',
      };
      if (this._token) headers['access_token'] = this._token;
      const reqOpts = { hostname: this._host, port: 443, path, method, headers };
      const req = https.request(reqOpts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const p = JSON.parse(data);
            if (p.success === false) {
              const code = p.code || 0;
              let msg = p.msg || 'API error ' + code;
              if (code === 1004) msg = 'Sign error — check Access ID and Secret';
              if (code === 1010 || msg.includes('token')) msg = 'Token expired';
              if (code === 1106) msg = 'No permissions — IoT Core subscription may have expired (renew at iot.tuya.com)';
              if (code === 2406) msg = 'Invalid skill — wrong region or app type. Try a different data center.';
              const err = new Error(msg);
              err.code = code;
              reject(err);
            } else { resolve(p); }
          } catch (e) { reject(new Error('Invalid API response')); }
        });
      });
      req.on('error', reject);
      req.setTimeout(20000, () => { req.destroy(); reject(new Error('Request timeout')); });
      if (bodyStr && method !== 'GET') req.write(bodyStr);
      req.end();
    });
  }

  // ── MODE 1: IoT Platform (Access ID + Secret) ──

  async getToken() {
    if (this._token && Date.now() < this._tokenExpiry - 60000) return this._token;
    this._token = null;
    const resp = await this._request('GET', '/v1.0/token?grant_type=1');
    this._token = resp.result.access_token;
    this._tokenExpiry = Date.now() + (resp.result.expire_time * 1000);
    this._uid = resp.result.uid || this._uid;
    this._log('[CLOUD] Token acquired, expires in ' + resp.result.expire_time + 's');
    return this._token;
  }

  // ── MODE 2: Smart Life Login (email + password) ──

  async loginWithSmartLife(email, password, countryCode, schema) {
    await this.getToken();
    schema = schema || 'smartlife';
    countryCode = String(countryCode || '33');
    const passwdHash = crypto.createHash('md5').update(password).digest('hex');
    // v5.11.16 SEC: Mask email in logs to prevent credential leakage in diagnostics
    const maskedEmail = email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : '???';
    this._log('[CLOUD] Smart Life login: ' + maskedEmail + ' (country ' + countryCode + ', schema ' + schema + ')');
    const resp = await this._request('POST', '/v1.0/iot-01/associated/users/actions/authorized-login', {
      username: email,
      password: passwdHash,
      country_code: countryCode,
      schema: schema,
    });
    if (resp.result && resp.result.access_token) {
      this._token = resp.result.access_token;
      this._tokenExpiry = Date.now() + ((resp.result.expire_time || 7200) * 1000);
      this._uid = resp.result.uid;
      this._log('[CLOUD] Smart Life login OK, uid=' + this._uid);
      return { success: true, uid: this._uid };
    }
    throw new Error('Smart Life login failed — check email/password and region');
  }

  // ── Device retrieval ──

  async getUsers() {
    await this.getToken();
    const resp = await this._request('GET', '/v1.0/iot-01/associated/users?page_no=1&page_size=100');
    return resp.result || [];
  }

  async getDevices(uid) {
    await this.getToken();
    const targetUid = uid || this._uid;
    if (!targetUid) {
      const users = await this.getUsers();
      if (!users.list || users.list.length === 0) throw new Error('No linked Smart Life accounts found. Link your account at iot.tuya.com > Devices > Link App Account.');
      const allDevices = [];
      for (const u of users.list) {
        try {
          const devs = await this._getDevicesForUser(u.uid);
          allDevices.push(...devs);
        } catch (e) { this._log('[CLOUD] Error fetching user ' + u.uid + ': ' + e.message); }
      }
      return allDevices;
    }
    return this._getDevicesForUser(targetUid);
  }

  async _getDevicesForUser(uid) {
    // v5.11.16 SEC: Sanitize uid to prevent path traversal
    if (!uid || typeof uid !== 'string' || /[^a-zA-Z0-9_-]/.test(uid)) {
      throw new Error('Invalid user ID');
    }
    const resp = await this._requestWithRetry('GET', '/v1.0/users/' + uid + '/devices');
    return (resp.result || []).map((d) => ({
      deviceId: d.id,
      name: d.name || '',
      localKey: d.local_key || '',
      category: d.category || '',
      productId: d.product_id || '',
      ip: d.ip || '',
      online: !!d.online,
      sub: !!d.sub,
      model: d.model || '',
      icon: d.icon || '',
    }));
  }

  async getDeviceById(deviceId) {
    // v5.11.16 SEC: Sanitize deviceId to prevent path traversal
    if (!deviceId || typeof deviceId !== 'string' || /[^a-zA-Z0-9_-]/.test(deviceId)) {
      throw new Error('Invalid device ID');
    }
    await this.getToken();
    const resp = await this._requestWithRetry('GET', '/v1.0/devices/' + deviceId);
    const d = resp.result;
    return {
      deviceId: d.id,
      name: d.name || '',
      localKey: d.local_key || '',
      category: d.category || '',
      productId: d.product_id || '',
      ip: d.ip || '',
      online: !!d.online,
      model: d.model || '',
    };
  }

  async refreshLocalKey(deviceId) {
    const dev = await this.getDeviceById(deviceId);
    return dev.localKey;
  }

  async _requestWithRetry(method, path, body) {
    try {
      return await this._request(method, path, body);
    } catch (err) {
      if (err.code === 1010 || (err.message && err.message.includes('Token expired'))) {
        this._log('[CLOUD] Token expired, refreshing...');
        this._token = null;
        this._tokenExpiry = 0;
        await this.getToken();
        return this._request(method, path, body);
      }
      throw err;
    }
  }

  // ── Helpers ──

  async getDeviceStatus(deviceId) {
    if (!deviceId || typeof deviceId !== 'string' || /[^a-zA-Z0-9_-]/.test(deviceId)) {
      throw new Error('Invalid device ID');
    }
    await this.getToken();
    const resp = await this._requestWithRetry('GET', '/v1.0/devices/' + deviceId + '/status');
    return resp.result || [];
  }

  async sendDeviceCommands(deviceId, commands) {
    if (!deviceId || typeof deviceId !== 'string' || /[^a-zA-Z0-9_-]/.test(deviceId)) {
      throw new Error('Invalid device ID');
    }
    await this.getToken();
    return this._requestWithRetry('POST', '/v1.0/devices/' + deviceId + '/commands', { commands });
  }

  async getDeviceSpecification(deviceId) {
    if (!deviceId || typeof deviceId !== 'string' || /[^a-zA-Z0-9_-]/.test(deviceId)) {
      throw new Error('Invalid device ID');
    }
    await this.getToken();
    const resp = await this._requestWithRetry('GET', '/v1.0/devices/' + deviceId + '/specifications');
    return resp.result || {};
  }

  static regionForCountry(code) {
    return COUNTRY_TO_REGION[Number(code)] || 'eu';
  }
}

module.exports = TuyaCloudAPI;
