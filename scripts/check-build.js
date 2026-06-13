'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const AthomApi = require('../node_modules/homey/services/AthomApi');

const APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
const APP_ID = APP_JSON.id || 'com.dlnraja.tuya.zigbee';

const buildId = process.argv[2] || '2463';

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
      console.log(`Checking status for Build ID: ${buildId}...`);
      const build = await getBuildDetails(token, buildId);
      if (build) {
        console.log('Raw build JSON:', JSON.stringify(build, null, 2));
        console.log(`Version: ${build.version}`);
        console.log(`State: ${build.state}`);
        console.log(`StateMeta:`, JSON.stringify(build.stateMeta || null, null, 2));
        console.log(`ArchiveUrl: ${build.archiveUrl}`);
        if (build.state === 'processing_failed') {
          console.log('\x1b[31m%s\x1b[0m', 'FAILED: Server-side processing failed (AggregateError or size issue).');
        } else if (build.state === 'test' || build.state === 'approved' || build.state === 'draft') {
          console.log('\x1b[32m%s\x1b[0m', `SUCCESS/ACTIVE: Build in ${build.state} state.`);
        } else {
          console.log('\x1b[33m%s\x1b[0m', `State: ${build.state}`);
        }
      } else {
        console.log(`Failed to fetch build #${buildId}`);
      }
    } else {
      console.log('Error: Could not retrieve delegation token. Make sure you are logged in.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
