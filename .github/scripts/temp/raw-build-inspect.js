'use strict';
process.chdir(require('path').join(__dirname, '..', '..', '..'));
const path = require('path');
const fs = require('fs');

const candidates = [
  'C:/Users/HP/AppData/Roaming/npm/node_modules/homey',
  path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey'),
];

let AthomApi, AthomAppsAPI;
for (const r of candidates) {
  try {
    AthomApi = require(path.join(r, 'services', 'AthomApi'));
    AthomAppsAPI = require(path.join(r, 'node_modules', 'homey-api')).AthomAppsAPI;
    console.log('Loaded from:', r);
    break;
  } catch (e) {
    // try next
  }
}

if (!AthomApi) { console.error('No AthomApi found'); process.exit(1); }

(async () => {
  const token = await AthomApi.createDelegationToken({ audience: 'apps' });
  const api = new AthomAppsAPI();
  api['_token'] = token;
  
  const appId = JSON.parse(fs.readFileSync('app.json', 'utf8')).id;
  console.log('App ID:', appId);
  
  const raw = await api.getBuilds({ '$token': token, appId });
  const arr = Array.isArray(raw) ? raw : (raw.items || raw.data || []);
  arr.sort((a, b) => b.id - a.id);
  
  console.log('\n=== BUILDS (raw) ===');
  arr.slice(0, 8).forEach(b => {
    console.log(`\nBuild #${b.id} v${b.version}:`);
    console.log('  state:', b.state);
    console.log('  sdk:', b.sdk);
    console.log('  size:', b.size);
    console.log('  stateMeta:', JSON.stringify(b.stateMeta));
    console.log('  runtime:', JSON.stringify(b.runtime));
    console.log('  platforms:', JSON.stringify(b.platforms));
  });
  // Find working build
  const working = arr.find(b => b.state === 'test' || b.state === 'live');
  if (working) {
    console.log('\n=== WORKING BUILD (test/live) ===');
    console.log(JSON.stringify(working, null, 2));
  } else {
    console.log('\nNo test/live build found');
  }
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
