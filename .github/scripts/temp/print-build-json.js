// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const globalHomey = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
const AthomApi = require(path.join(globalHomey, 'services', 'AthomApi'));

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
    const tokenObj = await AthomApi.createDelegationToken({ audience: 'apps' });
    const token = tokenObj?.token || tokenObj?.access_token || tokenObj;
    
    if (token) {
      const buildId = process.argv[2] || '2456';
      const res = await getBuildDetails(token, buildId);
      console.log(`Status: ${res.status}`);
      const parsed = JSON.parse(res.body);
      console.log(JSON.stringify(parsed, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
