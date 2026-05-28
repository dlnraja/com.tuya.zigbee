const AthomApi = require('c:\\Users\\HP\\Desktop\\homey-app\\tuya_repair\\node_modules\\homey\\services\\AthomApi.js');
const fetch = require('c:\\Users\\HP\\Desktop\\homey-app\\tuya_repair\\node_modules\\node-fetch');

async function main() {
  console.log('Retrieving delegation token via AthomApi service...');
  const delegationToken = await AthomApi.createDelegationToken({
    audience: 'apps'
  });

  const appId = 'com.dlnraja.tuya.zigbee';
  console.log(`Fetching all builds for: ${appId}`);
  
  const url = `https://apps-api.athom.com/api/v1/app/${appId}/build`;
  const res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + delegationToken,
      'Accept': 'application/json'
    }
  });
  
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.builds || data.data || []);
  list.sort((a, b) => (a.id || 0) - (b.id || 0)); // chronologique
  
  console.log(`Total builds found: ${list.length}`);
  
  let firstFailedBuild = null;
  let consecFailures = 0;
  let totalFailures = 0;
  
  for (const b of list) {
    if (b.state === 'processing_failed') {
      totalFailures++;
      consecFailures++;
      if (!firstFailedBuild) {
        firstFailedBuild = b;
      }
    } else {
      consecFailures = 0; // reset consécutifs si succès ou autre état valide
    }
  }
  
  console.log('\n--- Build Analysis ---');
  console.log(`Total Builds: ${list.length}`);
  console.log(`Total Failed Builds ('processing_failed'): ${totalFailures}`);
  
  if (firstFailedBuild) {
    console.log(`First failed build: #${firstFailedBuild.id} (Version: ${firstFailedBuild.version}) on ${firstFailedBuild.createdAt}`);
    console.log(`Error Meta: ${JSON.stringify(firstFailedBuild.stateMeta)}`);
  }
  
  // Compter le nombre de builds consécutifs échoués à la fin de la liste
  let endConsecFailures = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].state === 'processing_failed') {
      endConsecFailures++;
    } else {
      break;
    }
  }
  console.log(`Consecutive failures at the end: ${endConsecFailures}`);
  
  // Trouver le dernier build réussi avant la série de pannes
  let lastSuccess = null;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].state !== 'processing_failed') {
      lastSuccess = list[i];
      break;
    }
  }
  if (lastSuccess) {
    console.log(`Last successful or non-failed build before series: #${lastSuccess.id} (Version: ${lastSuccess.version}, State: ${lastSuccess.state}) on ${lastSuccess.createdAt}`);
  }
  
  // Afficher les 70 derniers builds pour analyse
  console.log('\n--- Last 70 Builds ---');
  const last70 = list.slice(-70);
  for (const b of last70) {
    console.log(`Build #${b.id} | v${b.version} | State: ${b.state} | Error: ${b.stateMeta ? JSON.stringify(b.stateMeta) : 'none'} | Date: ${b.createdAt}`);
  }
}

main().catch(err => {
  console.error(err);
});
