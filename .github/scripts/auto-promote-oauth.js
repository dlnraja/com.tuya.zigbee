#!/usr/bin/env node
'use strict';
const fs = require('fs');
const APP = 'com.dlnraja.tuya.zigbee';
const E = process.env.HOMEY_EMAIL, P = process.env.HOMEY_PASSWORD;
const SUM = process.env.GITHUB_STEP_SUMMARY;
const CID = process.env.ATHOM_CLIENT_ID;
const CSC = process.env.ATHOM_CLIENT_SECRET;
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
  if (!CID || !CSC) { log('Need ATHOM_CLIENT_ID + ATHOM_CLIENT_SECRET'); process.exit(1); }
  let tk = await pwGrant();
  if (!tk) tk = await implicitFlow();
  if (!tk) tk = await authCodeFlow();
  if (!tk) { log('No access token'); process.exit(1); }
  log('Token: present');
  // Strategy 1: AthomCloudAPI (handles delegation like the SPA)
  try {
    log('CloudAPI strategy');
    await promoteViaCloudApi(tk);
    return;
  } catch (e) { log('  CloudAPI: ' + e.message); }
  const delegTokens = await getAllDelegations(tk);
  log('Delegations: ' + delegTokens.length + ' tokens');
  const tokens = [...delegTokens.map(d => ({tk: d.token, label: 'deleg:'+d.aud})), {tk, label: 'raw'}];
  let lastErr;
  for (const {tk: t, label} of tokens) {
    try {
      log('  Trying SDK (' + label + ')');
      await promoteWithSdk(t);
      return;
    } catch (e) {
      log('  SDK failed: ' + e.message);
    }
    try {
      log('  Trying raw (' + label + ')');
      await promoteRaw(t);
      return;
    } catch (e) {
      log('  Raw failed: ' + e.message);
      lastErr = e;
    }
  }
  throw lastErr || new Error('All tokens failed');
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
async function implicitFlow() {
  log('Step 1b: Implicit flow (response_type=token)');
  try {
    const lr = await fetch(AUTH+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:E,password:P}),redirect:'manual'});
    const b = await lr.json(); log('  Login: '+lr.status);
    const sc=lr.headers.getSetCookie?.()||[]; const ck=sc.map(c=>c.split(';')[0]).join('; ');
    const ah={}; if(ck)ah.Cookie=ck; if(b.token)ah.Authorization='Bearer '+b.token;
    const au=AUTH+'/oauth2/authorise?client_id='+CID+'&redirect_uri='+encodeURIComponent(REDIR)+'&response_type=token&scopes=apps';
    let token=null,next=au;
    for(let i=0;i<5&&!token;i++){
      const r=await fetch(next,{headers:ah,redirect:'manual'});
      const loc=r.headers.get('location')||'';
      log('  Hop '+(i+1)+': '+r.status+' loc='+(loc?loc.substring(0,80)+'...':'none'));
      if(!loc) break;
      // Token may be in URL fragment (#access_token=...) or query (?access_token=...)
      const hashIdx=loc.indexOf('#');
      if(hashIdx>=0){const frag=new URLSearchParams(loc.substring(hashIdx+1));token=frag.get('access_token')}
      if(!token){try{token=new URL(loc,REDIR).searchParams.get('access_token')}catch{}}
      if(!token) next=loc;
    }
    if(token){log('  Implicit token: obtained');return token;}
    log('  No implicit token');
  } catch(e){log('  Implicit err: '+e.message)}
  return null;
}
async function authCodeFlow() {
  log('Step 1c: Auth code flow');
  const lr = await fetch(AUTH+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:E,password:P}),redirect:'manual'});
  const b = await lr.json(); log('  Login: '+lr.status);
  const sc=lr.headers.getSetCookie?.()||[]; const ck=sc.map(c=>c.split(';')[0]).join('; ');
  const ah={}; if(ck)ah.Cookie=ck; if(b.token)ah.Authorization='Bearer '+b.token;
  const au=AUTH+'/oauth2/authorise?client_id='+CID+'&redirect_uri='+encodeURIComponent(REDIR)+'&response_type=code&scopes=apps';
  let code=null,next=au;
  for(let i=0;i<5&&!code;i++){const r=await fetch(next,{headers:ah,redirect:'manual'});const loc=r.headers.get('location')||'';log('  Hop '+(i+1)+': '+r.status);if(!loc)break;try{code=new URL(loc,REDIR).searchParams.get('code')}catch{}if(!code)next=loc}
  if(!code){log('  No auth code');return null}
  const tbody='client_id='+CID+'&client_secret='+CSC+'&grant_type=authorization_code&code='+code+'&redirect_uri='+encodeURIComponent(REDIR);
  const tokenUrls=[APIB+'/oauth2/token',AUTH+'/oauth2/token','https://apps-api.athom.com/oauth2/token'];
  for(const tu of tokenUrls){
    try{
      const tr=await fetch(tu,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tbody});
      const tj=await tr.json(); log('  Exchange('+tu.split('//')[1].split('/')[0]+'): '+tr.status);
      if(tj.access_token) return tj.access_token;
    }catch(e){log('  Exchange err: '+e.message)}
  }
  return null;
}
async function getAllDelegations(tk) {
  log('Step 2: Delegation tokens (all audiences)');
  const results = [];
  for (const aud of ['apps','apps-api','https://apps-api.athom.com','apps-api.athom.com','homey-apps','homey']) {
    try {
      const r=await fetch(APIB+'/delegation/token',{method:'POST',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({audience:aud})});
      const txt=await r.text(); log('  deleg('+aud+'): '+r.status+' len='+txt.length);
      if(!r.ok) continue;
      let dtk; try{const j=JSON.parse(txt);dtk=j.token||j.access_token||(typeof j==='string'?j:null)}catch{dtk=txt.replace(/"/g,'')}
      if(dtk) results.push({token: dtk, aud});
    } catch(e){log('  deleg('+aud+') err: '+e.message)}
  }
  return results;
}
async function promoteViaCloudApi(rawToken) {
  const {AthomCloudAPI, AthomAppsAPI} = require('athom-api');
  const cloud = new AthomCloudAPI({clientId: CID, clientSecret: CSC});
  cloud.setToken(rawToken);
  for (const aud of ['homey','apps','apps-api']) {
    try {
      const dtk = await cloud.createDelegationToken({audience: aud});
      const token = dtk?.token || dtk;
      if (!token) continue;
      log('  CloudAPI deleg('+aud+'): obtained');
      const api = new AthomAppsAPI({token});
      const builds = await api.getBuilds({appId:APP});
      const draft = builds.find(b=>/draft/i.test(b.channel||''));
      if(!draft){log('  No draft');process.exit(0)}
      await api.updateBuildChannel({appId:APP,buildId:draft.id||draft._id,channel:'test'});
      log('  Promoted via CloudAPI!'); return;
    } catch(e){log('  CloudAPI('+aud+'): '+e.message)}
  }
  throw new Error('CloudAPI: all audiences failed');
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
  const urls=['https://apps-api.athom.com/api/v1/app/'+APP+'/build','https://apps-api.athom.com/api/v1/app/'+APP+'/builds','https://apps-api.athom.com/api/v1/app/'+APP];
  let r,ok=false;
  for(const u of urls){r=await fetch(u,{headers:hd});const st=r.status;log('  GET '+u.split(APP)[1]+' → '+st);if(st===401){const t=await r.text().catch(()=>'');log('    401: '+t.slice(0,200))}if(r.ok){ok=true;break}}
  if(!ok){const t=await r.text().catch(()=>'');log('  '+t);throw new Error('builds '+r.status+': '+t)}
  const d=await r.json();
  const arr=Array.isArray(d)?d:(d.builds||[]);
  const draft=arr.find(b=>/draft/i.test(b.channel||''));
  if(!draft){log('  No draft');process.exit(0)}
  const pid=draft.id||draft._id;
  const base=r.url.substring(0,r.url.indexOf('/app/'));
  const pr=await fetch(base+'/app/'+APP+'/build/'+pid+'/channel',{
    method:'PUT',headers:{...hd,'Content-Type':'application/json'},
    body:JSON.stringify({channel:'test'})});
  log('  Promote: '+pr.status);
  if(!pr.ok) throw new Error('promote '+pr.status);
  log('  Promoted!');
}
