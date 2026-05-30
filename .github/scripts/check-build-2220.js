'use strict';
// check-build-2220.js — Vérifie et tente de promouvoir le build #2220 en test
const path = require('path'), fs = require('fs'), https = require('https');

const settings = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'athom-cli','settings.json'),'utf8'));
const PAT = settings && settings.homeyApi && settings.homeyApi.token && settings.homeyApi.token.access_token || '';
const APP = 'com.dlnraja.tuya.zigbee';
const BUILD_ID = 2220;

function deleg() {
  return new Promise(function(resolve) {
    const b = JSON.stringify({audience:'apps'});
    const req = https.request({
      hostname:'api.athom.com', path:'/delegation/token', method:'POST',
      headers:{'Authorization':'Bearer '+PAT,'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}
    }, function(res) {
      let d='';
      res.on('data',function(c){d+=c;});
      res.on('end',function(){
        const t = d.trim().replace(/^"/,'').replace(/"$/,'');
        if (t.indexOf('eyJ') === 0) { resolve(t); return; }
        try { const p = JSON.parse(d); resolve(p.token || p.access_token || null); } catch(e){ resolve(null); }
      });
    });
    req.on('error',function(){resolve(null);});
    req.setTimeout(8000,function(){req.destroy();resolve(null);});
    req.write(b); req.end();
  });
}

function api(method, endpoint, tok, body) {
  return new Promise(function(resolve) {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization':'Bearer '+tok,
      'Accept':'application/json',
      'User-Agent':'homey-cli/6.4.0'
    };
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const opts = {
      hostname:'apps-api.athom.com',
      path:'/api/v1'+endpoint,
      method: method,
      headers: headers
    };
    const req = https.request(opts, function(res){
      let d='';
      res.on('data',function(c){d+=c;});
      res.on('end',function(){
        try{ resolve({s:res.statusCode,d:JSON.parse(d)}); }
        catch(e){ resolve({s:res.statusCode,raw:d.slice(0,200)}); }
      });
    });
    req.on('error',function(e){resolve({err:e.message});});
    req.setTimeout(10000,function(){req.destroy();resolve({err:'timeout'});});
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('=== BUILD #'+BUILD_ID+' STATE CHECK ===');
  const tok = await deleg();
  if (!tok) { console.log('ERROR: No delegation token'); process.exit(1); }
  console.log('Delegation token: ok ('+tok.length+' chars)');
  console.log('');

  // Get build info
  const bRes = await api('GET', '/app/'+APP+'/build/'+BUILD_ID, tok);
  console.log('Build #'+BUILD_ID+' HTTP', bRes.s);
  
  if (bRes.d) {
    const b = bRes.d;
    console.log('  version:      ', b.version);
    console.log('  state:        ', b.state);
    console.log('  channel:      ', b.channel);
    console.log('  archiveId:    ', b.archiveId);
    console.log('  stateChanged: ', b.stateChangedAt);
    console.log('  platforms:    ', JSON.stringify(b.platforms));
    console.log('  permissions:  ', JSON.stringify(b.permissions));
    console.log('  driverCount:  ', b.drivers ? b.drivers.length : 'unknown');
    
    if (b.state === 'test' || b.channel === 'test') {
      console.log('');
      console.log('OK: Already in test state!');
      return;
    }
    
    if (b.state === 'processing_failed') {
      console.log('');
      console.log('PROCESSING FAILED - archive issue');
      return;
    }
  } else {
    console.log('  raw:', bRes.raw || bRes.err);
  }
  
  // Try to promote to test
  console.log('');
  console.log('=== ATTEMPTING PROMOTION ===');
  
  const attempts = [
    ['PUT',  '/app/'+APP+'/build/'+BUILD_ID,                   {channel:'test'}],
    ['PUT',  '/app/'+APP+'/build/'+BUILD_ID,                   {state:'test'}],
    ['POST', '/app/'+APP+'/build/'+BUILD_ID+'/publish',        {channel:'test'}],
    ['PUT',  '/app/'+APP+'/build/'+BUILD_ID+'/channel',        {channel:'test'}],
    ['PATCH','/app/'+APP+'/build/'+BUILD_ID,                   {state:'test'}],
  ];
  
  for (const att of attempts) {
    const m = att[0], ep = att[1], bd = att[2];
    const r = await api(m, ep, tok, bd);
    const status = r.s || r.err;
    const ok = r.s && r.s >= 200 && r.s < 300;
    console.log((ok?'[OK] ':'[??] ')+m+' '+ep.split('/').slice(-1)+' body='+JSON.stringify(bd)+' => HTTP '+status);
    if (ok) {
      console.log('SUCCESS! Promoted to test channel');
      break;
    }
    if (r.raw) console.log('  response:', r.raw.slice(0,100));
    if (r.d && r.d.error) console.log('  error:', r.d.error);
  }
}

main().catch(function(e){ console.error('FATAL:', e.message); process.exit(1); });
