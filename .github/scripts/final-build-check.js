'use strict';
// final-build-check.js - Vérifie l'état final du build 2220 et le build actuel de l'app
const https = require('https'), fs = require('fs'), path = require('path');
const s = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'athom-cli','settings.json'),'utf8'));
const PAT = s.homeyApi.token.access_token;
const APP = 'com.dlnraja.tuya.zigbee';

function deleg() {
  return new Promise(function(resolve) {
    const b = JSON.stringify({audience: 'apps'});
    const req = https.request({
      hostname:'api.athom.com', path:'/delegation/token', method:'POST',
      headers: {
        'Authorization':'Bearer '+PAT,
        'Content-Type':'application/json',
        'Content-Length':Buffer.byteLength(b)
      }
    }, function(r) {
      var d = '';
      r.on('data', function(c){ d += c; });
      r.on('end', function(){
        var t = d.trim();
        // Strip surrounding quotes if present
        if (t[0] === '"') t = t.slice(1);
        if (t[t.length-1] === '"') t = t.slice(0,-1);
        resolve(t.indexOf('eyJ') === 0 ? t : null);
      });
    });
    req.on('error', function(){ resolve(null); });
    req.setTimeout(8000, function(){ req.destroy(); resolve(null); });
    req.write(b);
    req.end();
  });
}

function apiFetch(url, tok) {
  return new Promise(function(resolve) {
    var u = new URL(url);
    var req = https.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'Authorization': 'Bearer ' + tok,
        'Accept': 'application/json',
        'User-Agent': 'homey-cli/6.4.0'
      }
    }, function(res) {
      var d = '';
      res.on('data', function(c){ d += c; });
      res.on('end', function(){
        try { resolve({s: res.statusCode, d: JSON.parse(d)}); }
        catch(e) { resolve({s: res.statusCode, raw: d.slice(0, 400)}); }
      });
    });
    req.on('error', function(e){ resolve({err: e.message}); });
    req.setTimeout(10000, function(){ req.destroy(); resolve({err: 'timeout'}); });
  });
}

async function main() {
  console.log('=== FINAL BUILD STATE CHECK ===');
  
  var tok = await deleg();
  if (!tok) {
    console.log('ERROR: No delegation token from api.athom.com');
    return;
  }
  console.log('Delegation token: ok (' + tok.length + ' chars)');
  console.log('');
  
  // Check build 2220
  console.log('--- BUILD #2220 ---');
  var b = await apiFetch('https://apps-api.athom.com/api/v1/app/'+APP+'/build/2220', tok);
  console.log('HTTP', b.s);
  if (b.d) {
    var bd = b.d;
    console.log('version:    ', bd.version);
    console.log('state:      ', bd.state);
    console.log('channel:    ', bd.channel);
    console.log('archiveId:  ', bd.archiveId);
    console.log('changed:    ', bd.stateChangedAt);
    if (bd.archiveId && bd.archiveId !== 'undefined') {
      var cdnOk = bd.archiveId.length > 10;
      console.log('CDN OK:     ', cdnOk ? 'YES' : 'NO (archiveId too short)');
    }
  } else {
    console.log('error:', b.raw || b.err);
  }
  
  console.log('');
  console.log('--- APP INFO (testBuild + liveBuild) ---');
  var a = await apiFetch('https://apps-api.athom.com/api/v1/app/'+APP, tok);
  console.log('HTTP', a.s);
  if (a.d) {
    var app = a.d;
    if (app.testBuild) {
      var tb = app.testBuild;
      console.log('testBuild: id='+tb.id+' v='+tb.version+' state='+tb.state);
      if (tb.archiveId && tb.archiveId !== 'undefined') {
        console.log('  CDN: https://apps.homeycdn.net/app/'+APP+'/'+tb.id+'/.../' + tb.archiveId + '.tar.gz');
      }
    } else {
      console.log('testBuild: NONE');
    }
    if (app.liveBuild) {
      var lb = app.liveBuild;
      console.log('liveBuild: id='+lb.id+' v='+lb.version+' state='+lb.state);
    } else {
      console.log('liveBuild: NONE');
    }
  } else {
    console.log('error:', a.raw || a.err);
  }
  
  // Also check CDN for build 2220 directly
  console.log('');
  console.log('--- CDN HEAD CHECK for build 2220 ---');
  var cdnCheck = await new Promise(function(resolve) {
    var req = https.request({
      hostname: 'apps.homeycdn.net',
      path: '/app/'+APP+'/2220',
      method: 'HEAD',
      headers: {'User-Agent': 'curl/7.88.0'}
    }, function(res) {
      resolve({s: res.statusCode, headers: res.headers});
    });
    req.on('error', function(e){ resolve({err: e.message}); });
    req.setTimeout(5000, function(){ req.destroy(); resolve({err: 'timeout'}); });
    req.end();
  });
  console.log('CDN /2220: HTTP', cdnCheck.s || cdnCheck.err);
}

main().catch(function(e){ console.error('FATAL:', e.message); });
