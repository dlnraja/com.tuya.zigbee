'use strict';

const Homey = require('homey');
const http = require('http');
const https = require('https');
const CircuitBreaker = require('../utils/CircuitBreaker');

class IntelligenceHealth {
  // v9.0.40 TITAN: Circuit breaker for fault tolerance
  static _breaker = new CircuitBreaker({
    name: 'IntelligenceHealth',
    failureThreshold: 3,
    resetTimeout: 60000,
    successThreshold: 1,
    maxBackoff: 300000,
    // Only count actual network errors, not "site unreachable" pings
    isFailure: (err) => err && err.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(err.code),
  });

  static async checkSources() {
    // This would be called from settings or a maintenance flow
    // It checks a subset of critical URLs to verify if the Homey Pro has internet access to sources
    const criticalUrls = [
      'https://github.com/dlnraja/com.tuya.zigbee',
      'https://zigbee.blakadder.com/index.html',
      'https://developers.homey.app/'
    ];

    const results = {};
    for (const url of criticalUrls) {
      results[url] = await this.ping(url);
    }
    return results;
  }

  static ping(url) {
    // v9.0.40 TITAN: Use circuit breaker to avoid hammering unreachable hosts
    return this._breaker.execWithFallback(
      () => new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 5000 }, (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302);
        });
        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Ping timeout'));
        });
      }),
      () => false, // Fallback: return false when circuit is open
    );
  }
}

module.exports = IntelligenceHealth;
