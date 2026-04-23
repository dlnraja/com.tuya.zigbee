'use strict';
// v5.12.7: TuyaSmartLifeAuth - SmartLife/Tuya Smart login for local key extraction
const crypto = require('crypto');
const https = require('https');

// Tuya data centers by region
const REGIONS = {
  us: { endpoint: 'https://openapi.tuyaus.com', name: 'Americas (US)' },
  eu: { endpoint: 'https://openapi.tuyaeu.com', name: 'Europe (EU)' },
  cn: { endpoint: 'https://openapi.tuyacn.com', name: 'China (CN)' },
  in: { endpoint: 'https://openapi.tuyain.com', name: 'India (IN)' },
  ue: { endpoint: 'https://openapi-ueaz.tuyaus.com', name: 'Americas (UE)' },
  we: { endpoint: 'https://openapi-weaz.tuyaeu.com', name: 'Europe (WE)' },
};

// SmartLife app client credentials
const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvfoju';

class TuyaSmartLifeAuth {
  constructor({ region = 'eu', log } = {}) {
    this.region = region;
    this.endpoint = (REGIONS[region] || REGIONS.eu).endpoint;
    this.log = log || console;
    this.tokenInfo = null;
    this.userCode = null;
    this.qrCode = null;
    this.schema = 'smartlife';
  }

  setSchema(schema) {
    this.schema = schema || 'smartlife';
  }

  // Step 1: Generate QR code URL
  async getQRCode(userCode) {
    this.userCode = userCode || crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const res = await this._request('POST', '/v1.0/iot-03/user-login/qr-code', null, {
      client_id: TUYA_CLIENT_ID,
      schema: this.schema,
      user_code: this.userCode,
    });
    if (res.success && res.result) {
      this.qrCode = res.result.qr_code;
      return { success: true, qrCode: this.qrCode, userCode: this.userCode };
    }
    return { success: false, error: res.msg || 'Failed to get QR code' };
  }

  // Step 2: Poll for QR code scan result
  async pollQRLogin(maxWaitMs = 120000) {
    if (!this.qrCode || !this.userCode) {
      return { success: false, error: 'Call getQRCode first' };
    }
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const res = await this._request('POST', '/v1.0/iot-03/user-login/qr-code/result', null, {
        qr_code: this.qrCode,
        client_id: TUYA_CLIENT_ID,
        user_code: this.userCode,
      });
      if (res.success && res.result) {
        this.tokenInfo = {
          access_token: res.result.access_token,
          refresh_token: res.result.refresh_token,
          uid: res.result.uid,
          expire_time: res.result.expire_time,
          terminal_id: res.result.terminal_id,
          endpoint: res.result.endpoint || this.endpoint,
        };
        if (res.result.endpoint) this.endpoint = res.result.endpoint;
        return { success: true, tokenInfo: this.tokenInfo };
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    return { success: false, error: 'QR code scan timeout' };
  }

  // Method 2: IoT Platform API
  async loginWithApiKey(accessId, accessKey, deviceId) {
    this.accessId = accessId;
    this.accessKey = accessKey;
    const res = await this._signedRequest('GET', '/v1.0/token?grant_type=1', accessId, accessKey);
    if (res.success && res.result) {
      this.tokenInfo = {
        access_token: res.result.access_token,
        refresh_token: res.result.refresh_token,
        uid: res.result.uid,
        expire_time: res.result.expire_time,
      };
      if (deviceId) {
        const devRes = await this._signedRequest('GET', '/v1.0/devices/' + deviceId, accessId, accessKey, this.tokenInfo.access_token);
        if (devRes.success && devRes.result) {
          this.tokenInfo.uid = devRes.result.uid;
        }
      }
      return { success: true, tokenInfo: this.tokenInfo };
    }
    return { success: false, error: res.msg || 'API key login failed' };
  }

  // Method 3: Simple Login (Email + Password)
  async loginWithEmailPassword(email, password, countryCode) {
    const regionsToTest = countryCode ? [this.region] : ['eu', 'us', 'cn', 'in'];
    let lastErr = 'Not found';

    for (const reg of regionsToTest) {
      this.region = reg;
      this.endpoint = REGIONS[reg].endpoint;
      
      const res = await this._request('POST', '/v1.0/iot-03/user-login/login', null, {
        username: email,
        password: crypto.createHash('md5').update(password).digest('hex'),
        country_code: countryCode || '33',
        client_id: TUYA_CLIENT_ID,
        schema: this.schema,
      });

      if (res.success && res.result) {
        this.tokenInfo = {
          access_token: res.result.access_token,
          refresh_token: res.result.refresh_token,
          uid: res.result.uid,
          expire_time: res.result.expire_time,
          region: reg,
        };
        this.log.log(`[AUTH]  Waterfall success: ${email} logged in via ${REGIONS[reg].name}`);
        return { success: true, tokenInfo: this.tokenInfo, count: res.result.device_count || 0 };
      }
      
      if (res.code === 1106 || res.code === 1004) {
        this.log.log(`[AUTH]  Waterfall: Region ${reg} failed (code ${res.code}), trying next...`);
        lastErr = res.msg;
        continue;
      }
      return { success: false, error: res.msg || 'Login failed' };
    }
    return { success: false, error: lastErr || 'Account not found in any region' };
  }

  async refreshAccessToken() {
    if (!this.tokenInfo || !this.tokenInfo.refresh_token) return false;
    
    const res = await this._request('GET', `/v1.0/token/${this.tokenInfo.refresh_token}`);
    if (res.success && res.result) {
      this.tokenInfo.access_token = res.result.access_token;
      this.tokenInfo.refresh_token = res.result.refresh_token;
      this.tokenInfo.expire_time = res.result.expire_time;
      return true;
    }
    return false;
  }

  async getDevicesWithLocalKeys() {
    if (!this.tokenInfo || !this.tokenInfo.access_token) {
      return { success: false, error: 'Not authenticated' };
    }
    let devices = [];
    if (this.tokenInfo.terminal_id) {
       devices = await this._getSharingDevices();
    }
    if (!devices.length && this.tokenInfo.uid) {
      devices = await this._getIoTDevices();
    }
    if (!devices.length) {
      devices = await this._getAssociatedDevices();
    }
    return { success: true, devices };
  }

  async _getSharingDevices() {
    const res = await this._authenticatedRequest('GET', '/v1.0/m/life/ha/devices');
    if (res.success && res.result) {
      return (res.result || []).map(d => this._normalizeDevice(d));
    }
    return [];
  }

  async _getIoTDevices() {
    let allDevices = [];
    let hasMore = true;
    let lastRowKey = '';
    while (hasMore) {
      const query = { source_type: 'tuyaUser', source_id: this.tokenInfo.uid, page_size: '50' };
      if (lastRowKey) query.last_row_key = lastRowKey;
      const res = await this._authenticatedRequest('GET', '/v1.3/iot-03/devices', query);
      if (res.success && res.result) {
        const list = res.result.list || res.result.devices || [];
        allDevices.push(...list.map(d => this._normalizeDevice(d)));
        hasMore = res.result.has_more || false;
        lastRowKey = res.result.last_row_key || '';
      } else { hasMore = false; }
    }
    return allDevices;
  }

  async _getAssociatedDevices() {
    let allDevices = [];
    let hasMore = true;
    let lastRowKey = '';
    while (hasMore) {
      const query = { size: '50' };
      if (lastRowKey) query.last_row_key = lastRowKey;
      const res = await this._authenticatedRequest('GET', '/v1.0/iot-01/associated-users/devices', query);
      if (res.success && res.result) {
        const list = res.result.devices || [];
        allDevices.push(...list.map(d => this._normalizeDevice(d)));
        hasMore = res.result.has_more || false;
        lastRowKey = res.result.last_row_key || '';
      } else { hasMore = false; }
    }
    return allDevices;
  }

  _normalizeDevice(d) {
    return {
      id: d.id,
      name: d.name || d.product_name || 'Unknown',
      local_key: d.local_key || '',
      category: d.category || '',
      product_id: d.product_id || '',
      product_name: d.product_name || '',
      ip: d.ip || '',
      online: d.online || false,
      node_id: d.node_id || '',
      uuid: d.uuid || '',
      uid: d.uid || '',
      support_local: d.support_local !== false,
    };
  }

  async getDeviceDataModel(deviceId) {
    const res = await this._authenticatedRequest('GET', '/v1.0/m/life/devices/' + deviceId + '/status');
    if (res.success && res.result) {
      return (res.result.dpStatusRelationDTOS || [])
        .filter(e => e.supportLocal)
        .map(e => ({ id: e.dpId, name: e.dpCode, type: e.valueType, format: e.valueDesc }));
    }
    return [];
  }

  async _request(method, path, params, body) {
    return this._httpRequest(method, this.endpoint, path, params, body, {});
  }

  async _authenticatedRequest(method, path, params, body) {
    const fullPath = path + (params ? '?' + new URLSearchParams(params).toString() : '');
    if (this.accessId && this.accessKey) {
      return this._signedRequest(method, fullPath, this.accessId, this.accessKey, this.tokenInfo.access_token);
    }
    const headers = { 'access_token': this.tokenInfo.access_token };
    return this._httpRequest(method, this.endpoint, fullPath, null, body, headers);
  }

  async _signedRequest(method, fullPath, accessId, accessKey, accessToken) {
    const t = Date.now().toString();
    const nonce = crypto.randomUUID();
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    const stringToSign = method + '\n' + contentHash + '\n\n/' + fullPath.replace(/^\//, '');
    const message = accessId + (accessToken || '') + t + nonce + stringToSign;
    const sign = crypto.createHmac('sha256', accessKey).update(message).digest('hex').toUpperCase();
    const headers = {
      'client_id': accessId,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      't': t,
      'nonce': nonce,
    };
    if (accessToken) headers['access_token'] = accessToken;
    return this._httpRequest(method, this.endpoint, fullPath, null, null, headers);
  }

  async _httpRequest(method, endpoint, path, params, body, extraHeaders) {
    const url = new URL(endpoint + path);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const bodyStr = body ? JSON.stringify(body) : null;
    return new Promise((resolve, reject) => {
      const options = {
        method: method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
      };
      const req = https.request(options, (res) => {
        if (res.statusCode === 502 || res.statusCode === 504) {
          this.log.log(`[AUTH]  Tuya API Error ${res.statusCode} (Gateway issue), retrying in 2s...`);
          req.destroy();
          setTimeout(() => {
            this._httpRequest(method, endpoint, path, params, body, extraHeaders).then(resolve).catch(reject);
          }, 2000);
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ success: false, msg: 'Parse error', code: res.statusCode }); } });
      });
      req.on('error', (err) => resolve({ success: false, msg: err.message }));
      req.setTimeout(15000, () => { req.destroy(); resolve({ success: false, msg: 'Timeout' }); });
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }
}

TuyaSmartLifeAuth.REGIONS = REGIONS;
TuyaSmartLifeAuth.TUYA_CLIENT_ID = TUYA_CLIENT_ID;
module.exports = TuyaSmartLifeAuth;
