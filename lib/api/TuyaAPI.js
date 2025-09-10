#!/usr/bin/env node
'use strict';

'use strict';

const axios = require('axios');
const crypto = require('crypto');

class TuyaAPI {
  constructor({ clientId, clientSecret, region = 'eu', logger, accessToken = null, refreshToken = null }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.region = region.toLowerCase();
    this.logger = logger || console;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.baseUrl = this._getBaseUrl(region);
    
    // Initialize axios instance
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'client_id': this.clientId,
      }
    });

    // Add request interceptor for authentication
    this.http.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers['access_token'] = this.accessToken;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token refresh
    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't already tried to refresh the token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshAccessToken();
            originalRequest.headers['access_token'] = this.accessToken;
            return this.http(originalRequest);
          } catch (refreshError) {
            this.logger.error('Failed to refresh access token:', refreshError);
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  _getBaseUrl(region) {
    const regionMap = {
      'us': 'https://openapi.tuyaus.com',
      'eu': 'https://openapi.tuyaeu.com',
      'cn': 'https://openapi.tuyacn.com',
      'in': 'https://openapi.tuyain.com',
    };
    
    return regionMap[region] || regionMap['eu'];
  }

  _sign(method, path, params = {}, body = {}) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Create string to sign
    const stringToSign = [
      method.toUpperCase(),
      this.clientId,
      timestamp,
      nonce,
      path,
      sortedParams ? `?${sortedParams}` : '',
      Object.keys(body).length > 0 ? JSON.stringify(body) : ''
    ].join('\n');
    
    // Calculate signature
    const sign = crypto
      .createHmac('sha256', this.clientSecret)
      .update(stringToSign, 'utf8')
      .digest('hex')
      .toUpperCase();
    
    return { sign, timestamp, nonce };
  }

  async authenticate() {
    try {
      const response = await this.http.post('/v1.0/token?grant_type=1', {
        username: this.clientId,
        password: crypto.createHash('sha256').update(this.clientSecret).digest('hex')
      });
      
      this.accessToken = response.data.result.access_token;
      this.refreshToken = response.data.result.refresh_token;
      
      // Schedule token refresh before it expires
      const expiresIn = (response.data.result.expires_in || 7200) * 1000; // Default to 2 hours
      this.refreshTimer = setTimeout(() => this.refreshAccessToken(), (expiresIn - 300) * 1000);
      
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresIn
      };
    } catch (error) {
      this.logger.error('Authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Tuya API');
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await this.http.post('/v1.0/token/' + this.refreshToken);
      
      this.accessToken = response.data.result.access_token;
      this.refreshToken = response.data.result.refresh_token;
      
      // Schedule next refresh
      const expiresIn = (response.data.result.expires_in || 7200) * 1000;
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refreshAccessToken(), (expiresIn - 300) * 1000);
      
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresIn
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  async getDevice(deviceId) {
    try {
      const response = await this.http.get(`/v1.0/devices/${deviceId}`);
      return response.data.result;
    } catch (error) {
      this.logger.error(`Failed to get device ${deviceId}:`, error.response?.data || error.message);
      throw new Error(`Failed to get device: ${deviceId}`);
    }
  }

  async getDeviceStatus(deviceId) {
    try {
      const response = await this.http.get(`/v1.0/devices/${deviceId}/status`);
      return response.data.result;
    } catch (error) {
      this.logger.error(`Failed to get status for device ${deviceId}:`, error.response?.data || error.message);
      throw new Error(`Failed to get status for device: ${deviceId}`);
    }
  }

  async sendCommand(deviceId, commands) {
    try {
      const response = await this.http.post(`/v1.0/devices/${deviceId}/commands`, {
        commands: Array.isArray(commands) ? commands : [commands]
      });
      return response.data.success;
    } catch (error) {
      this.logger.error(`Failed to send command to device ${deviceId}:`, error.response?.data || error.message);
      throw new Error(`Failed to send command to device: ${deviceId}`);
    }
  }

  async disconnect() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.accessToken = null;
    this.refreshToken = null;
  }
}

module.exports = TuyaAPI;
