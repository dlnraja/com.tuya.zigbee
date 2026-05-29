'use strict';
const AthomApi = require('../node_modules/homey/lib/AthomApi');
const { AthomAppsAPI } = require('homey-api');

(async () => {
  try {
    const athomApi = new AthomApi();
    const token = await athomApi.createDelegationToken({ audience: 'apps' });
    const athomAppsApi = new AthomAppsAPI();

    console.log('Fetching all builds for com.dlnraja.tuya.zigbee...');
    const builds = await athomAppsApi.getBuilds({
      $token: token,
      appId: 'com.dlnraja.tuya.zigbee'
    });

    console.log('--- 5 MOST RECENT BUILDS DETAILS ---');
    const sorted = builds.sort((a, b) => b.id - a.id).slice(0, 5);
    sorted.forEach(b => {
      console.log(`\nBuild #${b.id} | Version: ${b.version}`);
      console.log(`State: ${b.state} | stateMeta: ${JSON.stringify(b.stateMeta)}`);
      console.log(`Created At: ${b.createdAt} | State Changed At: ${b.stateChangedAt}`);
    });
  } catch (error) {
    console.error('Error fetching builds:', error);
  }
})();
