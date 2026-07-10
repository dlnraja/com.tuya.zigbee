// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const globalHomey = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
const AthomApi = require(path.join(globalHomey, 'services', 'AthomApi'));
const { AthomAppsAPI } = require(path.join(globalHomey, 'node_modules', 'homey-api'));

const APP_JSON = JSON.parse(fs.readFileSync('c:/Users/HP/Desktop/homey-app/tuya_repair/app.json', 'utf8'));
const APP_ID = APP_JSON.id || 'com.dlnraja.tuya.zigbee';

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
    console.log('Generating delegation token via official AthomApi.createDelegationToken()...');
    const tokenObj = await AthomApi.createDelegationToken({ audience: 'apps' });
    // tokenObj is either a string JWT or an object with token/access_token
    const token = tokenObj?.token || tokenObj?.access_token || tokenObj;
    console.log('Token type:', typeof tokenObj);
    console.log('Token keys:', tokenObj ? Object.keys(tokenObj) : 'null');
    console.log('Token length:', token ? token.length : 0);
    
    if (token) {
      console.log('Querying build 2454 using the delegation token...');
      const res = await getBuildDetails(token, '2454');
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${res.body.slice(0, 1000)}`);
    } else {
      console.error('Failed to obtain delegation token');
    }
  } catch (e) {
    console.error('Error:', e.message, e.stack);
  }
})();
