// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const SETTINGS_PATH = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
const APP_JSON = JSON.parse(fs.readFileSync('c:/Users/HP/Desktop/homey-app/tuya_repair/app.json', 'utf8'));
const APP_ID = APP_JSON.id || 'com.dlnraja.tuya.zigbee';

function readCliSession() {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  const api = settings.homeyApi || {};
  return api.token;
}

async function tryDelegation(accessToken, aud) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      audience: aud,
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subjectToken: accessToken,
      subjectTokenType: 'urn:ietf:params:oauth:token-type:access_token'
    });
    const opts = {
      hostname: 'api.athom.com',
      path: '/delegation/token',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(raw);
            resolve(parsed.token || parsed.access_token || parsed);
          } catch {
            resolve(raw.trim().replace(/^"|"$/g, ''));
          }
        } else {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function getBuildDetails(token, buildId) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'apps-api.athom.com',
      path: `/api/v1/app/${APP_ID}/build/${buildId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body: raw });
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.end();
  });
}

(async () => {
  try {
    const token = readCliSession();
    const buildId = '2454';
    const audiences = ['apps', 'apps-api', 'https://apps-api.athom.com', 'apps-api.athom.com', 'homey-apps', 'homey', 'api'];
    
    for (const aud of audiences) {
      const delegToken = await tryDelegation(token.access_token, aud);
      if (!delegToken) {
        console.log(`Audience ${aud}: Failed to get delegation token`);
        continue;
      }
      const res = await getBuildDetails(delegToken, buildId);
      console.log(`Audience ${aud} -> Status: ${res.status}, Body: ${res.body.slice(0, 300)}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
