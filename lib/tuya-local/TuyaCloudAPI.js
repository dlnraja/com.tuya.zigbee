'use strict';
const { safeMultiply } = require('../utils/tuyaUtils.js');
// v5.12.7: TuyaCloudAPI - Tuya Open API client for WiFi device discovery
// Pattern from jurgenheine/com.tuya.cloud + Drenso/com.tuya2
// Used during pairing to discover devices on the user's Tuya account
const crypto = require('crypto');
const https = require('https');

const ENDPOINTS = {
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

class TuyaCloudAPI {
  constructor({ accessId, accessKey, region = 'eu', log }) {
    this.endpoint = ENDPOINTS[region] || ENDPOINTS.eu;
    this.accessId = accessId;
    this.accessKey = accessKey;
    this.log = log || console;
    this.tokenInfo = { access_token: '', refresh_token: '', uid: '', expire: 0 };
  }

  async login(username, password) {
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex').toLowerCase();
    const res = await this._post('/v1.0/iot-03/users/login', {
      username, password: passwordHash,
    });
    if (res.success) {
      const { access_token, refresh_token, uid, expire } = res.result;
      this.tokenInfo = { access_token, refresh_token, uid, expire: expire + Date.now() };
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
    return this._get('/v1.0/iot-03/devices/' + deviceId + '/status');
  }

  async sendCommand(deviceId, commands) {
    return this._post('/v1.0/iot-03/devices/' + deviceId + '/commands', { commands });
  }

  async _getAssets() {
    const res = await this._get('/v1.0/iot-03/users/assets', { parent_asset_id, page_no: 0, page_size: 100 });
    return (res.result && res.result.assets) || [];
  }

  async _getAssetDevices(assetId) {
    const res = await this._get('/v1.0/iot-02/assets/' + assetId + '/devices');
    return (res.result && res.result.list) || [];
  }

  async _refreshTokenIfNeeded() {
    if (!this.tokenInfo.access_token) return;
    if (this.tokenInfo.expire - 60000 > Date.now()) return;
    this.tokenInfo.access_token = '';
    const res = await this._get('/v1.0/token/' + this.tokenInfo.refresh_token);
    if (res.success && res.result) {
      const { access_token, refresh_token, uid, expire } = res.result;
      this.tokenInfo = { access_token, refresh_token, uid, expire:safeMultiply(expire, 1000) + Date.now() };
    }
  }

  _sign(method, path, params, body, timestamp) {
    const accessToken = this.tokenInfo.access_token || '';
    const nonce = crypto.randomUUID();
    const bodyStr = body ? JSON.stringify(body) : '';
    const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const headers = 'client_id:' + this.accessId + '\n';
    let url = path;
    if (params && Object.keys(params).length) {
      url += '?' + Object.entries(params).map(([k, v]) => k + '=' + v).join('&');
    }
    const stringToSign = method.toUpperCase() + '\n' + contentHash + '\n' + headers + '\n' + url;
    const message = this.accessId + accessToken + timestamp + nonce + stringToSign;
    const sign = crypto.createHmac('sha256', this.accessKey).update(message).digest('hex').toUpperCase();
    return { sign, nonce };
  }

  async _request(method, path, params, body) {
    const timestamp = Date.now().toString();
    const { sign, nonce } = this._sign(method, path, params, body, timestamp);
    const url = new URL(this.endpoint + path);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new Promise((resolve, reject) => {
      const options = { method: null, hostname: url.hostname,
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
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ success: false }); } });
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
      if (body) req.write(JSON.stringify(body));
      req.end();
      });
  }

  async _get(path, params) { return this._request('GET', path, params); }
  async _post(path, body) { return this._request('POST', path, null, body); }
}

module.exports = TuyaCloudAPI;



