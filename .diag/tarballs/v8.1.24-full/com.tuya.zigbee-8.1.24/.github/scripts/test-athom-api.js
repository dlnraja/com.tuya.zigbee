#!/usr/bin/env node
/**
 * test-athom-api.js
 * Uses AthomApi.createDelegationToken() exactly like homey CLI does,
 * then calls getBuilds + getBuild via AthomAppsAPI.
 */
'use strict';

const path = require('path');
const homeyRoot = path.join(process.env.APPDATA, 'npm', 'node_modules', 'homey');

const AthomApi    = require(path.join(homeyRoot, 'services', 'AthomApi'));
const { AthomAppsAPI } = require(path.join(homeyRoot, 'node_modules', 'homey-api'));

const APP_ID   = 'com.dlnraja.tuya.zigbee';
const BUILD_ID = process.argv[2] || '2204';

(async () => {
  try {
    console.log('[1] Creating delegation token (audience: apps)...');
    const token = await AthomApi.createDelegationToken({ audience: 'apps' });
    console.log('Token type:', typeof token);
    if (token) console.log('Token preview:', String(token).slice(0, 60));

    console.log('\n[2] Creating AthomAppsAPI client...');
    const api = new AthomAppsAPI();
    console.log('Base URL:', api.baseUrl);

    // List all operations available
    const ops = Object.keys(api).filter(k => typeof api[k] === 'function' && !k.startsWith('_'));
    console.log('Available operations:', ops.slice(0, 20).join(', '));

    console.log('\n[3] Getting builds list...');
    const builds = await api.getBuilds({
      '$token': token,
      appId: APP_ID,
    }).catch(e => ({ error: e.message }));
    console.log('Builds result:', JSON.stringify(builds).slice(0, 1000));

    console.log('\n[4] Getting build #' + BUILD_ID + '...');
    const build = await api.getBuild({
      '$token': token,
      appId: APP_ID,
      buildId: BUILD_ID,
    }).catch(e => ({ error: e.message }));
    console.log('Build result:', JSON.stringify(build, null, 2).slice(0, 2000));

  } catch (e) {
    console.error('Fatal:', e.message);
    console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
  }
})();
