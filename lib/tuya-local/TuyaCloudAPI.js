'use strict';
// v5.12.7: TuyaCloudAPI - Tuya Open API client for WiFi device discovery
// Pattern from jurgenheine/com.tuya.cloud + Drenso/com.tuya2
// Used during pairing to discover devices on the user's Tuya account
const crypto = require('crypto');
const https = require('https');
const CircuitBreaker = require('../utils/CircuitBreaker');

const ENDPOINTS = {
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

function createLogger(log) {
  if (typeof log === 'function') return log;
  if (log && typeof log.log === 'function') return (...args) => log.log(...args);
  return () => {};
}

class TuyaCloudAPI {
  constructor({ accessId, accessKey, region = 'eu', log }) {
    this.endpoint = ENDPOINTS[region] || ENDPOINTS.eu;
    this.accessId = accessId;
    this.accessKey = accessKey;
    this.log = createLogger(log);
    this.tokenInfo = { access_token: '', refresh_token: '', uid: '', expire: 0 };

    // v9.0.40 TITAN: Circuit breaker for fault tolerance
    this._breaker = new CircuitBreaker({
      name: 'TuyaCloudAPI',
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
      maxBackoff: 300000,
      log: (msg) => this.log(msg),
    });
  }

  async login(username, password) {
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex').toLowerCase();
    const res = await this._post('/v1.0/iot-03/users/login', {
      username, password: passwordHash,
    });
    if (res.success) {
      const { access_token, refresh_token, uid, expire } = res.result;
      // v9.0.40: Fix - Tuya API returns expire as TTL in seconds (e.g. 7200)
      this.tokenInfo = { access_token, refresh_token, uid, expire: (expire * 1000) + Date.now() };
    }
    return res;
  }

  async getDevices() {
    await this._refreshTokenIfNeeded();
    const assets = await this._getAssets();
    const allDevices = [];
    for (const asset of assets) {
      const devices = await this._getAssetDevices(asset.asset_id);
      allDevices.push(...devices);
    }
    return allDevices;
  }

  async getDeviceStatus(deviceId) {
    await this._refreshTokenIfNeeded();
    return this._get(`/v1.0/iot-03/devices/${  deviceId  }/status`);
  }

  async getDeviceInfo(deviceId) {
    await this._refreshTokenIfNeeded();
    return this._get(`/v1.0/iot-03/devices/${  deviceId  }`);
  }

  async sendCommand(deviceId, commands) {
    await this._refreshTokenIfNeeded(); // v9.0.40: Was missing - would fail on expired token
    return this._post(`/v1.0/iot-03/devices/${  deviceId  }/commands`, { commands });
  }

  async _getAssets() {
    const res = await this._get('/v1.0/iot-03/users/assets', { parent_asset_id: null, page_no: 0, page_size: 100 });
    return (res.result && res.result.assets) || [];
  }

  async _getAssetDevices(assetId) {
    const res = await this._get(`/v1.0/iot-02/assets/${  assetId  }/devices`);
    return (res.result && res.result.list) || [];
  }

  async _refreshTokenIfNeeded() {
    if (!this.tokenInfo.access_token) {return;}
    if (this.tokenInfo.expire - 60000 > Date.now()) {return;}
    this.tokenInfo.access_token = '';
    const res = await this._get(`/v1.0/token/${  this.tokenInfo.refresh_token}`);
    if (res.success && res.result) {
      const { access_token, refresh_token, uid, expire } = res.result;
      // v9.0.40: Fix inconsistent expire - both login and refresh return TTL in seconds
      this.tokenInfo = { access_token, refresh_token, uid, expire: (expire * 1000) + Date.now() };
    }
  }

  _sign(method, path, params, body, timestamp) {
    const accessToken = this.tokenInfo.access_token || '';
    const nonce = crypto.randomUUID();
    const bodyStr = body ? JSON.stringify(body) : '';
    const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const headers = `client_id:${  this.accessId  }\n`;
    const url = TuyaCloudAPI._buildSignedPath(path, params);
    const stringToSign = `${method.toUpperCase()  }\n${  contentHash  }\n${  headers  }\n${  url}`;
    const message = this.accessId + accessToken + timestamp + nonce + stringToSign;
    const sign = crypto.createHmac('sha256', this.accessKey).update(message).digest('hex').toUpperCase();
    return { sign, nonce };
  }

  async _request(method, path, params, body) {
    // v9.0.40 TITAN: Wrap in circuit breaker for fault tolerance
    return this._breaker.exec(() => this._rawRequest(method, path, params, body));
  }

  async _rawRequest(method, path, params, body) {
    const timestamp = Date.now().toString();
    const { sign, nonce } = this._sign(method, path, params, body, timestamp);
    const url = new URL(this.endpoint + TuyaCloudAPI._buildSignedPath(path, params));
    return new Promise((resolve, reject) => {
      const options = {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'client_id': this.accessId,
          'sign': sign,
          'sign_method': 'HMAC-SHA256',
          't': timestamp,
          'nonce': nonce,
          'access_token': this.tokenInfo.access_token || '',
          'Content-Type': 'application/json',
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (!data) {
            resolve({ success: false, code: res.statusCode, msg: `Empty Tuya response (${res.statusCode})` });
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.success === false && !parsed.msg && parsed.code) {
              parsed.msg = TuyaCloudAPI.describeError(parsed.code);
            }
            resolve(parsed);
          } catch (err) {
            resolve({ success: false, code: res.statusCode, msg: `Invalid Tuya JSON response: ${err.message}` });
          }
        });
      });
      // v9.0.40: 15s timeout to prevent hanging requests
      req.setTimeout(15000, () => {
        req.destroy(new Error('TuyaCloudAPI request timeout (15s)'));
      });
      req.on('error', reject);
      if (body) {req.write(JSON.stringify(body));}
      req.end();
    });
  }

  async _get(path, params) { return this._request('GET', path, params); }
  async _post(path, body) { return this._request('POST', path, null, body); }

  static describeError(code) {
    const normalized = String(code);
    if (normalized === '2001') return 'Device offline or not reachable in Tuya cloud';
    return `Tuya API error ${normalized}`;
  }

  static _buildSignedPath(path, params) {
    const url = new URL(`http://localhost${path}`);
    Object.entries(params || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => url.searchParams.set(key, String(value)));
    return `${url.pathname}${url.search}`;
  }
}

module.exports = TuyaCloudAPI;
