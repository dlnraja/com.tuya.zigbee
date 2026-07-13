// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const globalHomey = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
const AthomApi = require(path.join(globalHomey, 'services', 'AthomApi'));

const APP_JSON = JSON.parse(fs.readFileSync('c:/Users/HP/Desktop/homey-app/tuya_repair/app.json', 'utf8'));
const APP_ID = APP_JSON.id || 'com.dlnraja.tuya.zigbee';

async function getBuilds(token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'apps-api.athom.com',
      path: `/api/v1/app/${APP_ID}/build?limit=15`,
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
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

(async () => {
  try {
    const tokenObj = await AthomApi.createDelegationToken({ audience: 'apps' });
    const token = tokenObj?.token || tokenObj?.access_token || tokenObj;
    
    if (token) {
      const builds = await getBuilds(token);
      if (Array.isArray(builds)) {
        console.log(`Latest builds for ${APP_ID}:`);
        builds.forEach(b => {
          console.log(`  Build #${b.id}: v${b.version} state=${b.state} size=${b.size || 'N/A'} date=${b.stateChangedAt}`);
        });
      } else {
        console.log('Error fetching builds:', builds);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
