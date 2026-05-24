'use strict';

const Homey = require('homey');
const http = require('http');
const https = require('https');

class IntelligenceHealth {
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
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 5000 }, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}

module.exports = IntelligenceHealth;
