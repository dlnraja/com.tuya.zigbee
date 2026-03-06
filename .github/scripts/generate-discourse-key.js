#!/usr/bin/env node
'use strict';
var crypto = require('crypto');
var http = require('http');
var cp = require('child_process');
var HOST = 'community.homey.app';
var PORT = 9876;
var pair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
});
var cid = crypto.randomBytes(16).toString('hex');
var redir = 'http://localhost:' + PORT + '/cb';
var url = 'https://' + HOST + '/user-api-key/new?application_name=Universal+Tuya+Zigbee+Bot&client_id=' + cid + '&scopes=write,read&public_key=' + encodeURIComponent(pair.publicKey) + '&nonce=' + cid + '&auth_redirect=' + encodeURIComponent(redir);
var srv = http.createServer(function(q, r) {
  if (q.url.indexOf('/cb') < 0) { r.end('no'); return; }
  var u = new URL(q.url, 'http://localhost:' + PORT);
  var p = u.searchParams.get('payload');
  if (!p) { r.end('no payload'); return; }
  try {
    var dec = crypto.privateDecrypt({ key: pair.privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(p, 'base64'));
    var j = JSON.parse(dec.toString());
    console.log('\nSUCCESS - API Key obtained (' + j.key.length + ' chars)');
    console.log('Run: gh secret set DISCOURSE_API_KEY -R dlnraja/com.tuya.zigbee');
    console.log('Then paste the key when prompted (not logged for security).');
    r.end('<h1>Done</h1><p>Key in terminal.</p>');
  } catch (e) { console.error(e.message); r.end('error'); }
  setTimeout(function() { process.exit(0); }, 2000);
});
srv.listen(PORT, function() {
  console.log('Open in Chrome as dlnraja:');
  console.log(url);
  if (process.platform === 'win32') cp.exec('start "" "' + url + '"');
});
setTimeout(function() { process.exit(1); }, 300000);
