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
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          resolve(null);
        }
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
      const buildIds = ['2159', '2456'];
      for (const bid of buildIds) {
        console.log(`\n=================== BUILD #${bid} ===================`);
        const build = await getBuildDetails(token, bid);
        if (build) {
          // Print state, stateMeta, size, and any other diagnostic fields
          console.log(`Version: ${build.version}`);
          console.log(`State: ${build.state}`);
          console.log(`StateMeta:`, JSON.stringify(build.stateMeta || null, null, 2));
          console.log(`ArchiveUrl: ${build.archiveUrl}`);
          console.log(`Keys present:`, Object.keys(build));
        } else {
          console.log(`Failed to fetch build #${bid}`);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
