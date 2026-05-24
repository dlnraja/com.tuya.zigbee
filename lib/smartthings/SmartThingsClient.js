'use strict';

const https = require('https');

class SmartThingsClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.smartthings.com/v1';
  }

  _request(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch (err) {
              resolve(data);
            }
          } else {
            let errorMsg = `SmartThings API Error: ${res.statusCode} ${res.statusMessage}`;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error && parsed.error.message) {
                errorMsg += ` - ${parsed.error.message}`;
              }
            } catch (e) {
              errorMsg += ` - ${data}`;
            }
            reject(new Error(errorMsg));
          }
        });
      });

      req.on('error', (err) => reject(err));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async getDevices() {
    const res = await this._request('/devices');
    return res.items || [];
  }

  async getDeviceStatus(deviceId) {
    return await this._request(`/devices/${deviceId}/status`);
  }

  async executeCommand(deviceId, capability, command, args = []) {
    const payload = {
      commands: [
        {
          component: 'main',
          capability: capability,
          command: command,
          arguments: args
        }
      ]
    };
    return await this._request(`/devices/${deviceId}/commands`, 'POST', payload);
  }
}

module.exports = SmartThingsClient;
