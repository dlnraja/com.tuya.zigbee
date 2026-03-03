#!/usr/bin/env node
'use strict';
const fs = require('fs');
const APP = 'com.dlnraja.tuya.zigbee';
const E = process.env.HOMEY_EMAIL, P = process.env.HOMEY_PASSWORD;
const DRY = process.env.DRY_RUN === 'true';
const SUM = process.env.GITHUB_STEP_SUMMARY;
const CID = 'REDACTED_ATHOM_CLIENT_ID';
const REDIR = 'https://tools.developer.homey.app';
const AUTH = 'https://accounts.athom.com';
const API = 'https://apps-api.athom.com/api/v1';
function log(m) { console.log(m); if (SUM) try { fs.appendFileSync(SUM, m+'\n'); } catch {} }
main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
async function main() {
  log('## Promote Draft->Test (Headless OAuth)');
  if (!E || !P) { log('Need HOMEY_EMAIL + HOMEY_PASSWORD'); process.exit(1); }
  log('Step 1: Login');
  const lr = await fetch(AUTH+'/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:E,password:P}), redirect:'manual'});
  log('Login: '+lr.status);
  const sc = lr.headers.getSetCookie?.() || [];
  const ck = sc.map(c=>c.split(';')[0]).join('; ');
  log('Cookies: '+sc.length);
  let sessionTk = null;
  try { const b=await lr.json(); sessionTk=b.token||null; log('Login keys: '+Object.keys(b).join(',')); } catch { log('Not JSON'); }
  log('Step 2: OAuth Authorize');
  const authHeaders = {};
  if (ck) authHeaders['Cookie'] = ck;
  if (sessionTk) authHeaders['Authorization'] = 'Bearer ' + sessionTk;
  const u=AUTH+'/oauth2/authorise?client_id='+CID+'&redirect_uri='+encodeURIComponent(REDIR)+'&response_type=code&scopes=apps';
  let code=null;
  let nextUrl=u;
  for(let i=0;i<5&&!code;i++){
    const ar=await fetch(nextUrl,{headers:authHeaders,redirect:'manual'});
    const loc=ar.headers.get('location')||'';
    log('  Hop '+(i+1)+': '+ar.status+' → '+loc.slice(0,150));
    if(!loc){const body=await ar.text().catch(()=>'');log('  Body: '+body.slice(0,200));break}
    try{code=new URL(loc,REDIR).searchParams.get('code')}catch{}
    if(!code) nextUrl=loc;
  }
  if(!code){log('No code after redirect chain');process.exit(1)}
  log('Code: '+code.slice(0,10)+'...');
  log('Step 3: Token Exchange');
  let tk=null;
  const tbody='client_id='+CID+'&grant_type=authorization_code&code='+code+'&redirect_uri='+encodeURIComponent(REDIR);
  for(const base of [AUTH,'https://api.athom.com']){
    const ep=base+'/oauth2/token';
    try{
      const tr=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tbody});
      const txt=await tr.text();
      log('  '+base.split('//')[1]+': '+tr.status+' → '+txt.slice(0,200));
      try{const j=JSON.parse(txt);tk=j.access_token}catch{}
      if(tk)break;
    }catch(e){log('  '+base+': '+e.message)}
  }
  if(tk) log('Access token: '+tk.length+'c');
  if(!tk){log('No access token');process.exit(1)}
  log('Step 4: Builds');
  const hd={Authorization:'Bearer '+tk,Accept:'application/json'};
  let builds=null;
  for(const ep of ['/app/'+APP+'/build','/app/'+APP+'/builds','/app/'+APP]){
    const r=await fetch(API+ep,{headers:hd});
    log('GET '+ep.split('/').pop()+': '+r.status);
    if(r.ok){const d=await r.json();builds=Array.isArray(d)?d:(d.builds||d.versions||null);if(builds)break}
  }
  if(!builds){log('No builds');process.exit(1)}
  log('Builds: '+builds.length);
  const draft=builds.find(b=>/draft/i.test(b.channel||b.status||''));
  if(!draft){log('No draft found');process.exit(0)}
  log('Draft: '+(draft.id||draft.version));
  if(DRY){log('DRY RUN');process.exit(0)}
  log('Step 5: Promote');
  const pid=draft.id||draft._id;
  for(const[m,u] of [['PUT',API+'/app/'+APP+'/build/'+pid],['POST',API+'/app/'+APP+'/build/'+pid+'/publish'],['PATCH',API+'/app/'+APP+'/build/'+pid]]){
    const r=await fetch(u,{method:m,headers:{...hd,'Content-Type':'application/json'},body:JSON.stringify({channel:'test'})});
    log(m+' '+u.split('/').pop()+': '+r.status);
    if(r.ok){log('Promoted to test!');process.exit(0)}
  }
  log('Promotion failed');process.exit(1);
}
