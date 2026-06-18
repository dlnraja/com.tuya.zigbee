'use strict';

const https = require('https');
const crypto = require('crypto');
const CircuitBreaker = require('../utils/CircuitBreaker');

/**
 * TuyaLocalWizard - Helper to fetch Tuya Local Keys via Tuya Cloud OpenAPI.
 * Emulates the 'tinytuya wizard' to fetch devices and their local keys.
 */
class TuyaLocalWizard {
  /**
   * @param {Object} opts
   * @param {string} opts.clientId - Tuya Cloud Access ID
   * @param {string} opts.clientSecret - Tuya Cloud Access Secret
   * @param {string} [opts.region='eu'] - Region code (eu, us, cn, in, we)
   * @param {Function} [opts.log] - Optional logger function
   */
  constructor(opts) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.region = opts.region || 'eu';
    this.log = opts.log || console.log;
    
    // Map regions to Tuya OpenAPI endpoints
    const regions = {
      eu: 'openapi.tuyaeu.com',
      us: 'openapi.tuyaus.com',
      cn: 'openapi.tuyacn.com',
      in: 'openapi.tuyain.com',
      we: 'openapi.tuyawe.com'
    };
    this.host = regions[this.region] || regions.eu;
    this.accessToken = null;

    // v9.0.40 TITAN: Circuit breaker for fault tolerance
    this._breaker = new CircuitBreaker({
      name: 'TuyaLocalWizard',
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
      maxBackoff: 300000,
      log: (msg) => this.log(msg),
    });
  }

  /**
   * Calculate HMAC-SHA256 signature for Tuya OpenAPI requests
   */
  _sign(str) {
    return crypto.createHmac('sha256', this.clientSecret).update(str, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * Make an HTTP request to Tuya OpenAPI
   */
  async _request(method, path, body = null, headers = {}) {
    // v9.0.40 TITAN: Wrap in circuit breaker for fault tolerance
    return this._breaker.exec(() => this._rawRequest(method, path, body, headers));
  }

  async _rawRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now().toString();
      const nonce = ''; // Optional nonce
      
      // Calculate signature header
      let signStr = this.clientId;
      if (this.accessToken) {
        signStr += this.accessToken;
      }
      signStr += timestamp + nonce;

      // Calculate string to sign (v1.0 API format)
      const contentHash = crypto.createHash('sha256').update(body ? JSON.stringify(body) : '').digest('hex');
      const stringToSign = `${method}\n${contentHash}\n\n${path}`;
      signStr += stringToSign;

      const signature = this._sign(signStr);

      const reqHeaders = {
        'client_id': this.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        ...headers
      };

      if (this.accessToken) {
        reqHeaders['access_token'] = this.accessToken;
      }

      if (body) {
        reqHeaders['Content-Type'] = 'application/json';
      }

      const options = {
        hostname: this.host,
        port: 443,
        path: path,
        method: method,
        headers: reqHeaders
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.success) {
              return reject(new Error(`Tuya API Error: ${parsed.msg} (Code: ${parsed.code})`));
            }
            resolve(parsed.result);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (e) => reject(e));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Authenticate and get a new access token
   */
  async authenticate() {
    this.log('[TUYA-WIZARD] Authenticating with Tuya Cloud...');
    const result = await this._request('GET', '/v1.0/token?grant_type=1');
    if (result && result.access_token) {
      this.accessToken = result.access_token;
      this.log('[TUYA-WIZARD] Authentication successful.');
      return this.accessToken;
    }
    throw new Error('Failed to retrieve access token');
  }

  /**
   * Fetch all devices linked to a specific App User UID
   * @param {string} uid - The Tuya App User ID
   * @returns {Promise<Array>} List of devices with local keys
   */
  async getDevicesByUser(uid) {
    if (!this.accessToken) await this.authenticate();
    this.log(`[TUYA-WIZARD] Fetching devices for UID: ${uid}`);
    return this._request('GET', `/v1.0/users/${uid}/devices`);
  }
  
  /**
   * Fetch details for a specific device, including its local key
   * @param {string} deviceId - The Tuya Device ID
   */
  async getDeviceDetails(deviceId) {
    if (!this.accessToken) await this.authenticate();
    this.log(`[TUYA-WIZARD] Fetching details for device: ${deviceId}`);
    return this._request('GET', `/v1.0/devices/${deviceId}`);
  }

  /**
   * High-level wizard flow: Get all devices and extract local keys
   * @param {string} uid - App User UID
   */
  async fetchAllLocalKeys(uid) {
    try {
      const devices = await this.getDevicesByUser(uid);
      const keys = [];
      for (const dev of devices) {
        keys.push({
          id: dev.id,
          name: dev.name,
          localKey: dev.local_key,
          ip: dev.ip,
          category: dev.category
        });
      }
      this.log(`[TUYA-WIZARD] Successfully retrieved ${keys.length} local keys.`);
      return keys;
    } catch (err) {
      this.log(`[TUYA-WIZARD] Error fetching local keys: ${err.message}`);
      throw err;
    }
  }
}

module.exports = TuyaLocalWizard;
