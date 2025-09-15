#!/usr/bin/env node
'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { URLSearchParams } = require('url');
const logger = require('@utils/logger');
const config = require('@config');
const { AppError } = require('@utils/errorHandler');

/**
 * Service for interacting with the Tuya API
 */
class TuyaApiService {
  /**
   * Initialize the Tuya API service
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = {
      baseUrl: options.baseUrl || 'https://openapi.tuyaeu.com',
      apiKey: options.apiKey || config.tuya.apiKey,
      apiSecret: options.apiSecret || config.tuya.apiSecret,
      accessToken: options.accessToken,
      refreshToken: options.refreshToken,
      version: options.version || 'v1.0',
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
    };

    // Initialize HTTP client
    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'client_id': this.config.apiKey,
      },
    });

    // Add request interceptor for authentication
    this.http.interceptors.request.use(
      (config) => this.addAuthHeaders(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't already tried to refresh the token
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the access token
            await this.refreshToken();
            
            // Update the authorization header
            originalRequest.headers['access_token'] = this.config.accessToken;
            
            // Retry the original request
            return this.http(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    this.initialized = false;
    this.logger = logger.child({ service: 'TuyaApiService' });
  }

  /**
   * Initialize the service (authenticate if needed)
   */
  async init() {
    try {
      if (!this.initialized) {
        this.logger.debug('Initializing Tuya API service...');
        
        // If we don't have an access token, authenticate
        if (!this.config.accessToken) {
          await this.authenticate();
        }
        
        this.initialized = true;
        this.logger.info('Tuya API service initialized');
      }
      
      return this;
    } catch (error) {
      this.logger.error('Error initializing Tuya API service:', error);
      throw new AppError(
        'Failed to initialize Tuya API service',
        500,
        'SERVICE_INIT_ERROR',
        { error }
      );
    }
  }

  /**
   * Add authentication headers to the request
   * @param {Object} config - Axios request config
   * @returns {Object} Updated request config
   */
  addAuthHeaders(config) {
    if (!this.config.accessToken) {
      return config;
    }

    // Add access token to headers
    config.headers = {
      ...config.headers,
      'access_token': this.config.accessToken,
    };

    // Add signature to headers if needed
    if (config.method !== 'get' && config.data) {
      const timestamp = Date.now().toString();
      const sign = this.generateRequestSignature(
        config.method.toUpperCase(),
        config.url,
        config.data,
        timestamp
      );

      config.headers = {
        ...config.headers,
        'sign': sign,
        't': timestamp,
        'sign_method': 'HMAC-SHA256',
      };
    }

    return config;
  }

  /**
   * Generate a request signature
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} path - Request path
   * @param {Object} params - Request parameters
   * @param {string} timestamp - Timestamp
   * @returns {string} Generated signature
   */
  generateRequestSignature(method, path, params, timestamp) {
    try {
      const headers = ''; // No headers included in signature for now
      const contentHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(params) || '')
        .digest('hex')
        .toLowerCase();

      const stringToSign = [
        method.toUpperCase(),
        contentHash,
        headers,
        path,
      ].join('\n');

      const signStr = this.config.apiKey + this.config.accessToken + timestamp + stringToSign;
      
      return crypto
        .createHmac('sha256', this.config.apiSecret)
        .update(signStr, 'utf8')
        .digest('hex')
        .toUpperCase();
    } catch (error) {
      this.logger.error('Error generating request signature:', error);
      throw new AppError(
        'Failed to generate request signature',
        500,
        'SIGNATURE_GENERATION_ERROR',
        { error }
      );
    }
  }

  /**
   * Authenticate with the Tuya API
   */
  async authenticate() {
    try {
      this.logger.debug('Authenticating with Tuya API...');
      
      const timestamp = Date.now().toString();
      const sign = crypto
        .createHash('sha256')
        .update(this.config.apiKey + timestamp + this.config.apiSecret)
        .digest('hex')
        .toUpperCase();

      const response = await this.http.post('/v1.0/token', {
        grant_type: '1', // 1: simple mode, 2: authorization code mode
      }, {
        headers: {
          't': timestamp,
          'sign': sign,
          'sign_method': 'HMAC-SHA256',
          'Content-Type': 'application/json',
        },
      });

      const { access_token, refresh_token, expires_in } = response.data.result;
      
      // Update tokens
      this.config.accessToken = access_token;
      this.config.refreshToken = refresh_token;
      
      // Set token expiration timer (refresh before it expires)
      const bufferTime = 300; // 5 minutes
      this.tokenRefreshTimeout = setTimeout(
        () => this.refreshToken(),
        (expires_in - bufferTime) * 1000
      );
      
      this.logger.info('Successfully authenticated with Tuya API');
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
      };
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      throw new AppError(
        'Failed to authenticate with Tuya API',
        error.response?.status || 500,
        'AUTHENTICATION_ERROR',
        {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        }
      );
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken() {
    try {
      if (!this.config.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      this.logger.debug('Refreshing access token...');
      
      const timestamp = Date.now().toString();
      const sign = crypto
        .createHash('sha256')
        .update(this.config.apiKey + this.config.refreshToken + timestamp)
        .digest('hex')
        .toUpperCase();

      const response = await this.http.post('/v1.0/token/' + this.config.refreshToken, {}, {
        headers: {
          't': timestamp,
          'sign': sign,
          'sign_method': 'HMAC-SHA256',
        },
      });

      const { access_token, refresh_token, expires_in } = response.data.result;
      
      // Update tokens
      this.config.accessToken = access_token;
      this.config.refreshToken = refresh_token;
      
      // Clear any existing timeout
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
      }
      
      // Set new token expiration timer
      const bufferTime = 300; // 5 minutes
      this.tokenRefreshTimeout = setTimeout(
        () => this.refreshToken(),
        (expires_in - bufferTime) * 1000
      );
      
      this.logger.info('Successfully refreshed access token');
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      
      // If refresh fails, clear tokens and force re-authentication
      this.config.accessToken = null;
      this.config.refreshToken = null;
      
      throw new AppError(
        'Failed to refresh access token',
        error.response?.status || 500,
        'TOKEN_REFRESH_ERROR',
        {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        }
      );
    }
  }

  /**
   * Make an API request with retry logic
   * @param {string} method - HTTP method
   * @param {string} path - API endpoint path
   * @param {Object} [data] - Request data
   * @param {Object} [params] - Query parameters
   * @param {Object} [headers] - Additional headers
   * @param {number} [retryCount] - Current retry count
   * @returns {Promise<Object>} API response data
   */
  async request(method, path, data = {}, params = {}, headers = {}, retryCount = 0) {
    try {
      // Ensure service is initialized
      if (!this.initialized) {
        await this.init();
      }
      
      const response = await this.http({
        method,
        url: path,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? { ...data, ...params } : params,
        headers: {
          ...headers,
        },
      });
      
      return response.data;
    } catch (error) {
      // If we get a 401 and have retries left, refresh token and retry
      if (error.response?.status === 401 && retryCount < this.config.retries) {
        this.logger.warn(`Authentication failed, refreshing token and retrying (${retryCount + 1}/${this.config.retries})...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        // Refresh token and retry
        await this.refreshToken();
        return this.request(method, path, data, params, headers, retryCount + 1);
      }
      
      // If we have retries left for other errors, retry
      if (retryCount < this.config.retries) {
        this.logger.warn(`Request failed, retrying (${retryCount + 1}/${this.config.retries})...`, {
          error: error.message,
          status: error.response?.status,
          path,
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        return this.request(method, path, data, params, headers, retryCount + 1);
      }
      
      // Max retries reached or non-retriable error
      this.logger.error('API request failed after retries:', {
        method,
        path,
        status: error.response?.status,
        error: error.message,
        response: error.response?.data,
      });
      
      throw new AppError(
        error.response?.data?.msg || 'API request failed',
        error.response?.status || 500,
        error.response?.data?.code || 'API_REQUEST_ERROR',
        {
          path,
          method,
          status: error.response?.status,
          data: error.response?.data,
        }
      );
    }
  }

  /**
   * Make a GET request
   * @param {string} path - API endpoint path
   * @param {Object} [params] - Query parameters
   * @param {Object} [headers] - Additional headers
   * @returns {Promise<Object>} API response data
   */
  get(path, params = {}, headers = {}) {
    return this.request('GET', path, {}, params, headers);
  }

  /**
   * Make a POST request
   * @param {string} path - API endpoint path
   * @param {Object} [data] - Request data
   * @param {Object} [params] - Query parameters
   * @param {Object} [headers] - Additional headers
   * @returns {Promise<Object>} API response data
   */
  post(path, data = {}, params = {}, headers = {}) {
    return this.request('POST', path, data, params, {
      'Content-Type': 'application/json',
      ...headers,
    });
  }

  /**
   * Make a PUT request
   * @param {string} path - API endpoint path
   * @param {Object} [data] - Request data
   * @param {Object} [params] - Query parameters
   * @param {Object} [headers] - Additional headers
   * @returns {Promise<Object>} API response data
   */
  put(path, data = {}, params = {}, headers = {}) {
    return this.request('PUT', path, data, params, {
      'Content-Type': 'application/json',
      ...headers,
    });
  }

  /**
   * Make a DELETE request
   * @param {string} path - API endpoint path
   * @param {Object} [data] - Request data
   * @param {Object} [params] - Query parameters
   * @param {Object} [headers] - Additional headers
   * @returns {Promise<Object>} API response data
   */
  delete(path, data = {}, params = {}, headers = {}) {
    return this.request('DELETE', path, data, params, headers);
  }

  /**
   * Clean up resources
   */
  async destroy() {
    try {
      // Clear any pending timeouts
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
        this.tokenRefreshTimeout = null;
      }
      
      this.initialized = false;
      this.logger.info('Tuya API service destroyed');
    } catch (error) {
      this.logger.error('Error destroying Tuya API service:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const tuyaApiService = new TuyaApiService();

module.exports = tuyaApiService;
