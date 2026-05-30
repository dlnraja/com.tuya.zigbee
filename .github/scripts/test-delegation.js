#!/usr/bin/env node
'use strict';
// test-delegation.js — Debug delegation token for apps-api
const https = require('https');
const fs = require('fs');
const path = require('path');

const settings = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'athom-cli','settings.json'),'utf8'));
const accessToken = settings.homeyApi.token.access_token;
console.log('CLI token:', accessToken.slice(0,30)+'...');

const body = JSON.stringify({ audience: 'apps' });

function httpsPost(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(opts) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Step 1: Delegation
  const delRes = await httpsPost({
    hostname: 'api.athom.com',
    path: '/delegation/token',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);
  
  console.log('\nDelegation status:', delRes.status);
  console.log('Delegation body:', delRes.body.slice(0,300));
  
  if (delRes.status !== 200) {
    console.log('\nDelegation failed. Trying direct CLI token...');
  }
  
  let delToken;
  if (delRes.status === 200) {
    const raw = delRes.body.trim();
    // Body is a quoted JWT string: "eyJ..." — strip the outer quotes
    try {
      const j = JSON.parse(raw);
      // If it parsed as a string (quoted JWT), use it directly
      if (typeof j === 'string') delToken = j;
      // If it's an object with token field
      else delToken = j.token || j.access_token || raw;
    } catch {
      delToken = raw.replace(/^"|"$/g, '');
    }
    console.log('Delegation token (first 60c):', delToken.slice(0,60));
  }
  
  const tokenToUse = delToken || accessToken;
  
  // Step 2: Test apps-api
  const buildRes = await httpsGet({
    hostname: 'apps-api.athom.com',
    path: '/api/v1/app/com.dlnraja.tuya.zigbee/build/2204',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + tokenToUse,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('\nBuild 2204 API status:', buildRes.status);
  console.log('Build 2204 response:', buildRes.body.slice(0,1000));
  
  // Step 3: Try builds list
  const listRes = await httpsGet({
    hostname: 'apps-api.athom.com',
    path: '/api/v1/app/com.dlnraja.tuya.zigbee/build?limit=5',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + tokenToUse,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('\nBuilds list status:', listRes.status);
  console.log('Builds list:', listRes.body.slice(0,1000));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
