const path=require('path');
const ROOT=path.join(__dirname);
process.chdir(ROOT);

(async()=>{
  const candidates=[
    path.join(process.env.APPDATA||'','npm','node_modules','homey'),
    'C:/Users/HP/AppData/Roaming/npm/node_modules/homey',
  ];
  let AthomApi, AthomAppsAPI;
  for(const r of candidates){
    try{
      AthomApi=require(path.join(r,'services','AthomApi'));
      const m=require(path.join(r,'node_modules','homey-api'));
      AthomAppsAPI=m.AthomAppsAPI;
      break;
    }catch{}
  }
  if(!AthomApi){console.error('No AthomApi'); process.exit(1);}
  const token=await AthomApi.createDelegationToken({audience:'apps'});
  const api=new AthomAppsAPI();
  api._token=token;
  const appId=JSON.parse(require('fs').readFileSync('app.json','utf8')).id;
  const builds=await api.getBuilds({'$token':token, appId});
  const arr=Array.isArray(builds)?builds:(builds.items||[]);
  const b=arr.sort((a,b)=>b.id-a.id)[0];
  console.log('BUILD #'+b.id);
  console.log('state:', b.state);
  console.log('version:', b.version);
  console.log('sdk:', b.sdk);
  console.log('archiveUrl:', b.archiveUrl);
  console.log('size:', b.size);
  console.log('error:', b.error||b.errorMessage||b.failureReason||'(none)');
  console.log('stateChangedAt:', b.stateChangedAt);
  // All keys
  console.log('ALL KEYS:', Object.keys(b).join(', '));
})().catch(e=>console.error('FATAL:',e.message));
