#!/usr/bin/env node
'use strict';
const fs = require('fs');
const APP = 'com.dlnraja.tuya.zigbee';
const E = process.env.HOMEY_EMAIL, P = process.env.HOMEY_PASSWORD;
const SUM = process.env.GITHUB_STEP_SUMMARY;
const CID = 'REDACTED_ATHOM_CLIENT_ID';
const CSC = 'REDACTED_ATHOM_CLIENT_SECRET';
const REDIR = 'https://tools.developer.homey.app';
const AUTH = 'https://accounts.athom.com';
const APIB = 'https://api.athom.com';
function log(m) {
  console.log(m);
  if (SUM) try { fs.appendFileSync(SUM, m + '\n'); } catch {}
}
main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
async function main() {
  log('## Promote Draft->Test (v3)');
  if (!E || !P) { log('Need HOMEY_EMAIL + HOMEY_PASSWORD'); process.exit(1); }
  let tk = await pwGrant();
  if (!tk) tk = await authCodeFlow();
  if (!tk) { log('No access token'); process.exit(1); }
  log('Token: ' + tk.length + 'c');
  const dtk = await getDelegation(tk);
  log('Delegation: ' + (dtk ? dtk.length + 'c' : 'none'));
  const apiTk = dtk || tk;
  await promoteWithSdk(apiTk);
}
async function pwGrant() {
  log('Step 1a: Password grant');
  try {
    const body = 'client_id=' + CID + '&client_secret=' + CSC
      + '&grant_type=password&username=' + encodeURIComponent(E)
      + '&password=' + encodeURIComponent(P);
    const r = await fetch(APIB + '/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const j = await r.json();
    log('  PW: ' + r.status + ' keys=' + Object.keys(j).join(','));
    if (j.access_token) return j.access_token;
  } catch (e) { log('  PW error: ' + e.message); }
  return null;
}
async function authCodeFlow() {
  log('Step 1b: Auth code flow');
  const lr = await fetch(AUTH+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:E,password:P}),redirect:'manual'});
  const b = await lr.json(); log('  Login: '+lr.status);
  const sc=lr.headers.getSetCookie?.()||[]; const ck=sc.map(c=>c.split(';')[0]).join('; ');
  const ah={}; if(ck)ah.Cookie=ck; if(b.token)ah.Authorization='Bearer '+b.token;
  const au=AUTH+'/oauth2/authorise?client_id='+CID+'&redirect_uri='+encodeURIComponent(REDIR)+'&response_type=code&scopes=apps';
  let code=null,next=au;
  for(let i=0;i<5&&!code;i++){const r=await fetch(next,{headers:ah,redirect:'manual'});const loc=r.headers.get('location')||'';log('  Hop '+(i+1)+': '+r.status);if(!loc)break;try{code=new URL(loc,REDIR).searchParams.get('code')}catch{}if(!code)next=loc}
  if(!code){log('  No auth code');return null}
  const tbody='client_id='+CID+'&client_secret='+CSC+'&grant_type=authorization_code&code='+code+'&redirect_uri='+encodeURIComponent(REDIR);
  const tr=await fetch(APIB+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tbody});
  const tj=await tr.json(); log('  Exchange: '+tr.status);
  return tj.access_token||null;
}
async function getDelegation(tk) {
  log('Step 2: Delegation token');
  try {
    const r=await fetch(APIB+'/delegation/token',{method:'POST',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({audience:'apps'})});
    const txt=await r.text(); log('  delegation: '+r.status+' len='+txt.length);
    if(!r.ok) return null;
    try{const j=JSON.parse(txt);return j.token||j.access_token||(typeof j==='string'?j:null)}catch{return txt.replace(/"/g,'')}
  } catch(e){log('  delegation err: '+e.message);return null}
}
async function promoteWithSdk(apiTk) {
  log('Step 3: Get builds');
  let api;
  try { api = new (require('athom-api').AthomAppsAPI)({token:apiTk}); } catch {
    log('  SDK not available, raw fetch');
    return promoteRaw(apiTk);
  }
  const builds = await api.getBuilds({appId:APP});
  log('  Builds: '+builds.length);
  const draft = builds.find(b=>/draft/i.test(b.channel||''));
  if(!draft){log('  No draft');process.exit(0)}
  log('  Draft: '+(draft.id||draft._id));
  await api.updateBuildChannel({appId:APP,buildId:draft.id||draft._id,channel:'test'});
  log('  Promoted!');
}
async function promoteRaw(apiTk) {
  const hd={Authorization:'Bearer '+apiTk,Accept:'application/json'};
  const base='https://apps-api.athom.com/api/v1';
  const r=await fetch(base+'/app/'+APP+'/build',{headers:hd});
  log('  Raw builds: '+r.status);
  if(!r.ok){log('  '+await r.text().catch(()=>''));process.exit(1)}
  const d=await r.json();
  const arr=Array.isArray(d)?d:(d.builds||[]);
  const draft=arr.find(b=>/draft/i.test(b.channel||''));
  if(!draft){log('  No draft');process.exit(0)}
  const pid=draft.id||draft._id;
  const pr=await fetch(base+'/app/'+APP+'/build/'+pid+'/channel',{
    method:'PUT',headers:{...hd,'Content-Type':'application/json'},
    body:JSON.stringify({channel:'test'})});
  log('  Promote: '+pr.status);
  if(!pr.ok) process.exit(1);
}
