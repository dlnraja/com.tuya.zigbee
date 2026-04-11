'use strict';
const https = require('https');

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

function fetch(url, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES } = options;
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'UniversalTuyaSync/1.0' },
        timeout,
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetch(res.headers.location, options).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          if (n < retries) return setTimeout(() => attempt(n + 1), 1000 * n);
          return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        }
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(data));
      });
      req.on('error', (e) => {
        if (n < retries) return setTimeout(() => attempt(n + 1), 1000 * n);
        reject(e);
      });
      req.on('timeout', () => {
        req.destroy();
        if (n < retries) return setTimeout(() => attempt(n + 1), 1000 * n);
        reject(new Error('Timeout fetching ' + url));
      });
    };
    attempt(1);
  });
}

function fetchJSON(url, options) {
  return fetch(url, options).then(JSON.parse);
}

module.exports = { fetch, fetchJSON };
