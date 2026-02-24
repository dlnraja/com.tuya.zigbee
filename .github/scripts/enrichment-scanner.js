/**
 * Enrichment Scanner - Cross-references Z2M, ZHA, Blakadder for new fingerprints
 * Finds new Tuya devices not yet in dlnraja's app and generates integration plan
 */
const fs=require('fs'),path=require('path');
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE=path.join(__dirname,'..','state','enrichment-state.json');
const{fetchWithRetry}=require('./retry-helper');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function loadState(){try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{lastRun:null,knownNew:[]}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')}

function buildIndex(){
  const idx=new Set();
  if(!fs.existsSync(DDIR))return idx;
  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    for(const m of(fs.readFileSync(f,'utf8').match(/"_T[A-Za-z0-9_]+"/g)||[]))idx.add(m.replace(/"/g,''));
  }
  return idx;
}

async function fetchJSON(url){
  try{const r=await fetchWithRetry(url,{headers:{'User-Agent':'tuya-enrichment-bot'}},{retries:3,label:'fetchJSON'});if(!r.ok)return null;return r.json()}
  catch{return null}
}

async function scanZ2MDevices(){
  console.log('  Fetching Z2M device list...');
  const data=await fetchJSON('https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/npm/devices.js');
  if(!data)return[];
  // Z2M exposes devices via their repo - parse Tuya fingerprints
  const raw=typeof data==='string'?data:JSON.stringify(data);
  const fps=[...new Set((raw.match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[]))];
  return fps;
}

async function scanZ2MIssues(token){
  console.log('  Fetching Z2M Tuya issues...');
  const url='https://api.github.com/search/issues?q=repo:Koenkk/zigbee2mqtt+_TZE284+state:open&per_page=20&sort=created&order=desc';
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-bot'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{headers:h},{retries:3,label:'z2mIssues'});
  if(!r.ok)return[];
  const d=await r.json();
  const fps=[];
  for(const iss of(d.items||[])){
    const found=[...new Set(((iss.title||'')+' '+(iss.body||'')).match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];
    if(found.length)fps.push(...found.map(fp=>({fp,source:'z2m-issue',issue:iss.number,title:iss.title?.substring(0,80),url:iss.html_url})));
  }
  return fps;
}

async function scanZHAIssues(token){
  console.log('  Fetching ZHA Tuya issues...');
  const url='https://api.github.com/search/issues?q=repo:zigpy/zha-device-handlers+tuya+state:open&per_page=20&sort=created&order=desc';
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-bot'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{headers:h},{retries:3,label:'zhaIssues'});
  if(!r.ok)return[];
  const d=await r.json();
  const fps=[];
  for(const iss of(d.items||[])){
    const found=[...new Set(((iss.title||'')+' '+(iss.body||'')).match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];
    if(found.length)fps.push(...found.map(fp=>({fp,source:'zha-issue',issue:iss.number,title:iss.title?.substring(0,80),url:iss.html_url})));
  }
  return fps;
}

async function scanBlakadder(){
  console.log('  Fetching Blakadder Zigbee DB...');
  const data=await fetchJSON('https://zigbee.blakadder.com/assets/js/zigbee.json');
  if(!data||!Array.isArray(data))return[];
  const fps=[];
  for(const dev of data){
    if(!dev.zigbeeModel||!dev.manufacturerName)continue;
    if(dev.manufacturerName.startsWith('_T'))fps.push(dev.manufacturerName);
  }
  return[...new Set(fps)];
}


const{callAI}=require('./ai-helper');

async function main(){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  const state=loadState();
  const idx=buildIndex();
  console.log('=== Enrichment Scanner ===');
  console.log('Known fingerprints:',idx.size);

  const allNew=[];

  // 1. Z2M issues (_TZE284 etc)
  const z2mIssues=await scanZ2MIssues(token);
  const z2mNew=z2mIssues.filter(f=>!idx.has(f.fp));
  console.log('Z2M issues: found',z2mIssues.length,'fps,',z2mNew.length,'new');
  allNew.push(...z2mNew);
  await sleep(2000);

  // 2. ZHA issues
  const zhaIssues=await scanZHAIssues(token);
  const zhaNew=zhaIssues.filter(f=>!idx.has(f.fp));
  console.log('ZHA issues: found',zhaIssues.length,'fps,',zhaNew.length,'new');
  allNew.push(...zhaNew);
  await sleep(2000);

  // 3. Blakadder
  const blakadder=await scanBlakadder();
  const blakNew=blakadder.filter(fp=>!idx.has(fp));
  console.log('Blakadder: found',blakadder.length,'fps,',blakNew.length,'new');
  for(const fp of blakNew)allNew.push({fp,source:'blakadder'});

  // 4. Gmail diagnostics (new fingerprints from user emails)
  try{const df=path.join(__dirname,'..','state','diagnostics-report.json');
    if(fs.existsSync(df)){const dr=JSON.parse(fs.readFileSync(df,'utf8'));
      const gmailFPs=(dr.newFingerprints||[]).filter(fp=>!idx.has(fp));
      console.log('Gmail diagnostics:',gmailFPs.length,'new FPs');
      for(const fp of gmailFPs)allNew.push({fp,source:'gmail-diag'});
    }}catch(e){console.log('Gmail skip:',e.message)}

  // 5. Forum scan results (device requests with missing fingerprints)
  try{const ff='/tmp/forum_issues.json';
    if(fs.existsSync(ff)){const fr=JSON.parse(fs.readFileSync(ff,'utf8'));
      let fc=0;for(const iss of fr){for(const fp of(iss.missing||[])){
        if(!idx.has(fp)){allNew.push({fp,source:'forum-request',user:iss.user,post:iss.postNum});fc++;}}}
      console.log('Forum requests:',fc,'new FPs');
    }}catch(e){console.log('Forum skip:',e.message)}

  // 6. Device interviews
  try{const di=path.join(__dirname,'..','..','docs','data','DEVICE_INTERVIEWS.json');
    if(fs.existsSync(di)){const iv=JSON.parse(fs.readFileSync(di,'utf8'));
      const arr=Array.isArray(iv)?iv:Object.values(iv);let ic=0;
      for(const d of arr){const fp=d.manufacturerName||d.mfr;
        if(fp&&fp.startsWith('_T')&&!idx.has(fp)){allNew.push({fp,source:'interview',pid:d.productId||d.pid});ic++;}}
      console.log('Device interviews:',ic,'new FPs');
    }}catch(e){console.log('Interview skip:',e.message)}

  // Deduplicate
  const deduped=new Map();
  for(const item of allNew){
    if(!deduped.has(item.fp))deduped.set(item.fp,item);
  }
  const uniqueNew=[...deduped.values()];
  console.log('\nTotal unique NEW fingerprints:',uniqueNew.length);

  // 4. AI analysis
  let aiPlan=null;
  if(uniqueNew.length>0){
    const sysPrompt='You are an expert on Tuya Zigbee devices. Given new fingerprints found from Z2M/ZHA/Blakadder that are NOT in the Universal Tuya Zigbee app, classify each by likely device type (switch, sensor, thermostat, cover, etc) and suggest which existing driver to add them to. Be concise. Output a Markdown table: | Fingerprint | Source | Likely Type | Suggested Driver |';
    const aiRes=await callAI(JSON.stringify(uniqueNew.slice(0,30),null,2),sysPrompt);
    aiPlan=aiRes?aiRes.text:null;
    if(aiPlan)console.log('AI plan generated:',aiPlan.length,'chars');
  }

  // 5. Save report
  const report={timestamp:new Date().toISOString(),totalNew:uniqueNew.length,newFingerprints:uniqueNew.slice(0,50),aiPlan};
  const reportPath=path.join(__dirname,'..','state','enrichment-report.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  saveState({lastRun:new Date().toISOString(),knownNew:uniqueNew.map(f=>f.fp).slice(0,100)});

  console.log('\n=== Done ===');
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Enrichment Scanner\n| Source | Total | New |\n|---|---|---|\n';
    md+='| Z2M Issues | '+z2mIssues.length+' | '+z2mNew.length+' |\n';
    md+='| ZHA Issues | '+zhaIssues.length+' | '+zhaNew.length+' |\n';
    md+='| Blakadder | '+blakadder.length+' | '+blakNew.length+' |\n';
    md+='| Gmail Diagnostics | — | '+uniqueNew.filter(f=>f.source==='gmail-diag').length+' |\n';
    md+='| Forum Requests | — | '+uniqueNew.filter(f=>f.source==='forum-request').length+' |\n';
    md+='| Device Interviews | — | '+uniqueNew.filter(f=>f.source==='interview').length+' |\n';
    md+='| **Total unique** | | **'+uniqueNew.length+'** |\n';
    if(aiPlan)md+='\n### Integration Plan\n'+aiPlan+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
