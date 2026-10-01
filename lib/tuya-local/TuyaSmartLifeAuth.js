'use strict';

/**
 * TuyaSmartLifeAuth.js (P2409)
 * SmartLife / Tuya Smart / IoT Platform auth for local_key extraction (pairing only).
 * Patterns: tuya-local HA tuya_sharing, TinyTuya Cloud, Tuya OpenAPI.
 */
const { safeSetTimeout } = require('../utils/safe-timers');
const crypto = require('crypto');
const https = require('https');
const CircuitBreaker = require('../utils/CircuitBreaker');
const {
  REGIONS,
  REGION_FALLBACK_ORDER,
  TUYA_SHARING_CLIENT_ID,
  DEVICE_LIST_APIS,
  normalizeRegion,
  getRegionEndpoint,
  normalizeAppSchema,
  buildSchemaFallbackChain,
} = require('./TuyaAuthCatalog');
const { normalizeLocalKey } = require('./UdpDiscoveryKeys');
const {
  TuyaSharingLogin,
  TuyaSharingCustomerApi,
  buildQrContent,
} = require('./TuyaSharingClient');

function createLogger(log) {
  if (typeof log === 'function') { return log; }
  if (log && typeof log.log === 'function') { return (...args) => log.log(...args); }
  return () => {};
}

function sleep(ms) {
  return new Promise((resolve) => {
    // No unref(): an unref'd poll timer let the event loop exit mid-poll (QR wait never resolved in tests).
    safeSetTimeout(globalThis, resolve, ms);
  });
}

class TuyaSmartLifeAuth {
  constructor({ region = 'eu', log, autoRegion = false, transport } = {}) {
    this.region = normalizeRegion(region);
    this.endpoint = getRegionEndpoint(this.region);
    this.log = createLogger(log);
    this.tokenInfo = null;
    this.userCode = null;
    this.qrCode = null;
    this.accessId = null;
    this.accessKey = null;
    this.autoRegion = !!autoRegion;
    this._lastSchema = 'smartlife';
    // Smart Life "User Code + QR" sharing session (tuya-device-sharing-sdk port)
    this._transport = transport || null;
    this._sharingLogin = new TuyaSharingLogin(transport ? { transport } : {});
    this._mode = null; // 'sharing' | 'legacy_qr' | 'iot'
    this.sharingSession = null;

    this._breaker = new CircuitBreaker({
      name: 'TuyaSmartLifeAuth',
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
      maxBackoff: 300000,
      log: (msg) => this.log(msg),
    });
  }

  setRegion(region) {
    this.region = normalizeRegion(region);
    this.endpoint = getRegionEndpoint(this.region);
  }

  /** Restore a persisted sharing session (key refresh at runtime, no QR). */
  static fromSharingSession(session, opts = {}) {
    const auth = new TuyaSmartLifeAuth(opts);
    auth._mode = 'sharing';
    auth.sharingSession = session;
    auth.tokenInfo = {
      access_token: session?.tokenInfo?.access_token,
      refresh_token: session?.tokenInfo?.refresh_token,
      uid: session?.tokenInfo?.uid,
      terminal_id: session?.terminalId,
      endpoint: session?.endpoint,
    };
    return auth;
  }

  /**
   * Smart Life / Tuya Smart sharing QR (no IoT developer account).
   * Requires the account "User Code" (app: Me → Settings → Account and Security → User Code).
   */
  async getSharingQRCode(userCode) {
    const res = await this._sharingLogin.requestQrCode(userCode);
    if (!res.success) {
      this.log(`[AUTH] Sharing QR failed: ${res.error}`);
      return res;
    }
    this._mode = 'sharing';
    this.userCode = res.userCode;
    this.qrCode = res.qrToken;
    this._lastSchema = 'haauthorize';
    this.log('[AUTH] Sharing QR OK (user code accepted)');
    return {
      success: true,
      qrCode: res.qrToken,
      qrContent: res.qrContent,
      userCode: res.userCode,
      schema: 'haauthorize',
      region: 'auto',
      mode: 'sharing',
    };
  }

  // ─── Method 1: QR Code Scan (recommended, no developer account) ───
  async getQRCode(userCode, appSchema = 'smartlife') {
    // A real account User Code → official sharing login (works for Smart Life + Tuya Smart).
    if (userCode && String(userCode).trim()) {
      return this.getSharingQRCode(userCode);
    }
    const schemas = buildSchemaFallbackChain(appSchema);
    this.userCode = userCode || crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    let lastErr = 'Failed to get QR code';

    for (const schema of schemas) {
      this._lastSchema = normalizeAppSchema(schema);
      const res = await this._request('POST', '/v1.0/iot-03/user-login/qr-code', null, {
        client_id: TUYA_SHARING_CLIENT_ID,
        schema: this._lastSchema,
        user_code: this.userCode,
      });
      if (res.success && res.result) {
        this.qrCode = res.result.qr_code;
        this._mode = 'legacy_qr';
        this.log(`[AUTH] QR OK schema=${this._lastSchema} region=${this.region}`);
        return {
          success: true,
          qrCode: this.qrCode,
          qrContent: `${this._lastSchema}://qrLogin?token=${this.qrCode}`,
          userCode: this.userCode,
          schema: this._lastSchema,
          region: this.region,
        };
      }
      lastErr = res.msg || res.code || lastErr;
      this.log(`[AUTH] QR fail schema=${this._lastSchema}: ${lastErr}`);
    }
    return {
      success: false,
      error: `${lastErr} — enter your User Code (Smart Life / Tuya Smart app: Me → Settings → Account and Security → User Code) to use the QR account link.`,
      needsUserCode: true,
    };
  }

  /** Try QR across regions when primary data-center rejects */
  async getQRCodeWithRegionFallback(userCode, appSchema = 'smartlife') {
    // Sharing login uses one global gateway; the account data-center comes back in the token.
    if (userCode && String(userCode).trim()) return this.getSharingQRCode(userCode);
    const regions = this.autoRegion
      ? [this.region, ...REGION_FALLBACK_ORDER.filter((r) => r !== this.region)]
      : [this.region];
    let last = { success: false, error: 'QR failed' };
    for (const region of regions) {
      this.setRegion(region);
      last = await this.getQRCode(userCode, appSchema);
      if (last.success) return last;
    }
    return last;
  }

  async pollQRLogin(maxWaitMs = 120000) {
    if (!this.qrCode || !this.userCode) {
      return { success: false, error: 'Call getQRCode first' };
    }
    if (this._mode === 'sharing') {
      const res = await this._sharingLogin.waitForLogin(this.qrCode, this.userCode, { maxWaitMs });
      if (!res.success) return { success: false, error: res.error };
      this.sharingSession = res.session;
      this.tokenInfo = {
        access_token: res.session.tokenInfo.access_token,
        refresh_token: res.session.tokenInfo.refresh_token,
        uid: res.session.tokenInfo.uid,
        expire_time: res.session.tokenInfo.expire_time,
        terminal_id: res.session.terminalId,
        endpoint: res.session.endpoint,
      };
      this.endpoint = res.session.endpoint || this.endpoint;
      this.log('[AUTH] Sharing login OK');
      return { success: true, schema: 'haauthorize', region: 'auto', mode: 'sharing', session: res.session };
    }
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const res = await this._request('POST', '/v1.0/iot-03/user-login/qr-code/result', null, {
        qr_code: this.qrCode,
        client_id: TUYA_SHARING_CLIENT_ID,
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
        if (res.result.endpoint) { this.endpoint = res.result.endpoint; }
        return { success: true, tokenInfo: this.tokenInfo, schema: this._lastSchema, region: this.region };
      }
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, maxWaitMs - elapsed);
      await sleep(Math.min(3000, Math.max(25, remaining)));
    }
    return { success: false, error: 'QR code scan timeout' };
  }

  // ─── Method 2: IoT Platform API (developer account) ───
  async loginWithApiKey(accessId, accessKey, deviceId) {
    this.accessId = accessId;
    this.accessKey = accessKey;

    const tryLogin = async () => {
      const res = await this._signedRequest('GET', '/v1.0/token?grant_type=1', accessId, accessKey);
      if (res.success && res.result) {
        this.tokenInfo = {
          access_token: res.result.access_token,
          refresh_token: res.result.refresh_token,
          uid: res.result.uid,
          expire_time: res.result.expire_time,
        };
        if (deviceId) {
          const devRes = await this._signedRequest(
            'GET',
            `/v1.0/devices/${deviceId}`,
            accessId,
            accessKey,
            this.tokenInfo.access_token
          );
          if (devRes.success && devRes.result) {
            this.tokenInfo.uid = devRes.result.uid;
          }
        }
        return { success: true, tokenInfo: this.tokenInfo, region: this.region };
      }
      return { success: false, error: res.msg || res.code || 'API key login failed', code: res.code };
    };

    let result = await tryLogin();
    if (result.success || !this.autoRegion) return result;

    for (const region of REGION_FALLBACK_ORDER) {
      if (region === this.region) continue;
      this.setRegion(region);
      this.log(`[AUTH] IoT token retry region=${region}`);
      result = await tryLogin();
      if (result.success) return result;
    }
    return result;
  }

  // ─── Get devices with local keys (multi-API cascade) ───
  async getDevicesWithLocalKeys() {
    if (!this.tokenInfo || !this.tokenInfo.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    if (this._mode === 'sharing' && this.sharingSession) {
      try {
        const api = new TuyaSharingCustomerApi(this.sharingSession, {
          ...(this._transport ? { transport: this._transport } : {}),
          onTokenUpdate: (sess) => {
            this.sharingSession = sess;
            if (typeof this.onSharingSessionUpdate === 'function') this.onSharingSessionUpdate(sess);
          },
        });
        const res = await api.listDevicesWithLocalKeys();
        this.sharingSession = api.session;
        if (!res.success) return { success: false, error: res.error };
        this.log(`[AUTH] Sharing devices total=${res.devices.length} with_local_key=${res.withKeys}`);
        return { success: true, devices: res.devices, withKeys: res.withKeys };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    const seen = new Map();
    const merge = (list) => {
      for (const d of list || []) {
        if (!d?.id) continue;
        const prev = seen.get(d.id) || {};
        seen.set(d.id, {
          ...prev,
          ...d,
          local_key: d.local_key || prev.local_key || '',
        });
      }
    };

    for (const api of DEVICE_LIST_APIS) {
      try {
        let batch = [];
        if (api.kind === 'sharing' && this.tokenInfo.terminal_id) {
          batch = await this._fetchSimpleList(api.path);
        } else if (api.kind === 'iot_uid' && this.tokenInfo.uid) {
          batch = await this._fetchPaginatedIoT(api.path);
        } else if (api.kind === 'associated') {
          batch = await this._fetchAssociated(api.path);
        } else if (api.kind === 'users' && this.tokenInfo.uid) {
          const path = api.path.replace('{uid}', this.tokenInfo.uid);
          batch = await this._fetchSimpleList(path, true);
        }
        if (batch.length) {
          this.log(`[AUTH] Device API ${api.id}: ${batch.length}`);
          merge(batch);
        }
      } catch (err) {
        this.log(`[AUTH] Device API ${api.id} error:`, err.message);
      }
    }

    const devices = [...seen.values()]
      .map((d) => this._normalizeDevice(d))
      .filter((d) => d.id);

    const withKeys = devices.filter((d) => d.local_key);
    this.log(`[AUTH] Devices total=${devices.length} with_local_key=${withKeys.length}`);
    return { success: true, devices, withKeys: withKeys.length };
  }

  async _fetchSimpleList(path, unwrapDevices = false) {
    const res = await this._authenticatedRequest('GET', path);
    if (!res.success || !res.result) return [];
    let list = res.result;
    if (Array.isArray(list)) return list.map((d) => this._normalizeDevice(d));
    if (unwrapDevices && Array.isArray(list.devices)) {
      return list.devices.map((d) => this._normalizeDevice(d));
    }
    if (Array.isArray(list.list)) return list.list.map((d) => this._normalizeDevice(d));
    if (Array.isArray(list.devices)) return list.devices.map((d) => this._normalizeDevice(d));
    return [];
  }

  async _fetchPaginatedIoT(path) {
    const allDevices = [];
    let hasMore = true;
    let lastRowKey = '';
    while (hasMore) {
      const query = { source_type: 'tuyaUser', source_id: this.tokenInfo.uid, page_size: '50' };
      if (lastRowKey) { query.last_row_key = lastRowKey; }
      const res = await this._authenticatedRequest('GET', path, query);
      if (res.success && res.result) {
        const list = res.result.list || res.result.devices || [];
        allDevices.push(...list.map((d) => this._normalizeDevice(d)));
        hasMore = !!res.result.has_more;
        lastRowKey = res.result.last_row_key || '';
      } else {
        hasMore = false;
      }
    }
    return allDevices;
  }

  async _fetchAssociated(path) {
    const allDevices = [];
    let hasMore = true;
    let lastRowKey = '';
    while (hasMore) {
      const query = { size: '50' };
      if (lastRowKey) { query.last_row_key = lastRowKey; }
      const res = await this._authenticatedRequest('GET', path, query);
      if (res.success && res.result) {
        const list = res.result.devices || res.result.list || [];
        allDevices.push(...list.map((d) => this._normalizeDevice(d)));
        hasMore = !!res.result.has_more;
        lastRowKey = res.result.last_row_key || '';
      } else {
        hasMore = false;
      }
    }
    return allDevices;
  }

  _normalizeDevice(d) {
    const rawKey = d.local_key || d.localKey || '';
    return {
      id: d.id || d.device_id || d.devId || '',
      name: d.name || d.product_name || 'Unknown',
      local_key: normalizeLocalKey(rawKey) || rawKey || '',
      category: d.category || '',
      product_id: d.product_id || d.productId || d.productKey || '',
      product_name: d.product_name || d.productName || '',
      ip: d.ip || d.ip_address || '',
      online: d.online || false,
      node_id: d.node_id || d.nodeId || '',
      uuid: d.uuid || '',
      uid: d.uid || '',
      support_local: d.support_local !== false,
      gateway_id: d.gateway_id || d.owner_id || '',
    };
  }

  async getDeviceDataModel(deviceId) {
    const res = await this._authenticatedRequest('GET', `/v1.0/m/life/devices/${deviceId}/status`);
    if (res.success && res.result) {
      return (res.result.dpStatusRelationDTOS || [])
        .filter((e) => e.supportLocal)
        .map((e) => ({ id: e.dpId, name: e.dpCode, type: e.valueType, format: e.valueDesc }));
    }
    return [];
  }

  async _request(method, path, params, body) {
    return this._httpRequest(method, this.endpoint, path, params, body, {});
  }

  async _authenticatedRequest(method, path, params, body) {
    if (this.accessId && this.accessKey) {
      // FIX: Tuya OpenAPI signs the query in lexicographic key order (tuya-connector-nodejs);
      // insertion order (source_type, source_id, page_size…) broke paginated device listing.
      const sorted = params ? Object.keys(params).sort().map((k) => [k, String(params[k])]) : [];
      const q = sorted.length ? `?${new URLSearchParams(sorted).toString()}` : '';
      return this._signedRequest(method, path + q, this.accessId, this.accessKey, this.tokenInfo.access_token);
    }
    const headers = { access_token: this.tokenInfo.access_token };
    return this._httpRequest(method, this.endpoint, path, params, body, headers);
  }

  async _signedRequest(method, fullPath, accessId, accessKey, accessToken) {
    const t = Date.now().toString();
    const nonce = crypto.randomUUID();
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    const stringToSign = `${method}\n${contentHash}\n\n/${fullPath.replace(/^\//, '')}`;
    const message = accessId + (accessToken || '') + t + nonce + stringToSign;
    const sign = crypto.createHmac('sha256', accessKey).update(message).digest('hex').toUpperCase();
    const headers = {
      client_id: accessId,
      sign,
      sign_method: 'HMAC-SHA256',
      t,
      nonce,
    };
    if (accessToken) { headers.access_token = accessToken; }
    return this._httpRequest(method, this.endpoint, fullPath, null, null, headers);
  }

  async _httpRequest(method, endpoint, path, params, body, extraHeaders) {
    return this._breaker.exec(() => this._rawHttpRequest(method, endpoint, path, params, body, extraHeaders));
  }

  async _rawHttpRequest(method, endpoint, path, params, body, extraHeaders) {
    const url = new URL(endpoint + path);
    if (params) { Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v))); }
    const bodyStr = body ? JSON.stringify(body) : null;
    return new Promise((resolve) => {
      const options = {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            try {
              const { looksLikeCloudRateLimit, markCloudRateLimited } = require('../wifi/CloudHealthState');
              if (res.statusCode === 429 || looksLikeCloudRateLimit(parsed)) {
                markCloudRateLimited({ reason: `auth_http_${res.statusCode}` });
              }
            } catch (_e) { /* optional */ }
            resolve(parsed);
          } catch {
            resolve({ success: false, msg: 'Parse error' });
          }
        });
      });
      req.on('error', (err) => resolve({ success: false, msg: err.message }));
      req.setTimeout(15000, () => { req.destroy(); resolve({ success: false, msg: 'Timeout' }); });
      if (bodyStr) { req.write(bodyStr); }
      req.end();
    });
  }
}

TuyaSmartLifeAuth.REGIONS = REGIONS;
TuyaSmartLifeAuth.TUYA_CLIENT_ID = TUYA_SHARING_CLIENT_ID;
TuyaSmartLifeAuth.buildQrContent = buildQrContent;
module.exports = TuyaSmartLifeAuth;
