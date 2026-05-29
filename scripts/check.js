'use strict';

const AthomApi = require('../node_modules/homey/lib/AthomApi');
const { AthomAppsAPI } = require('homey-api');

async function main() {
  const athomApi = new AthomApi();
  const token = await athomApi.createDelegationToken({ audience: 'apps' });
  const athomAppsApi = new AthomAppsAPI();

  const appId = 'com.dlnraja.tuya.zigbee';

  const builds = await athomAppsApi.getBuilds({
    $token: token,
    appId: appId,
  });

  const sortedBuilds = [...builds].sort((a, b) => parseInt(b.id) - parseInt(a.id));
  console.log('\n--- LATEST BUILDS STATUS ---');
  sortedBuilds.slice(0, 5).forEach(b => {
    console.log(`Build #${b.id}: Version ${b.version} | State: ${b.state} | Error: ${b.error || 'None'}`);
  });
}

main().catch(console.error);
