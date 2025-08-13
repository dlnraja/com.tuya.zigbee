// !/usr/bin/env node
'use strict';
const fs = require('fs');

function fail(msg){ console.error('[health] ' + msg); process.exit(1); }
function ok(msg){ console.log('[health] ' + msg); }

(function main(){
  if (!fs.existsSync('drivers-index.json')) fail('drivers-index.json missing');
  if (!fs.existsSync('dashboard/index.html')) fail('dashboard/index.html missing');
  const composeReport = 'reports/validation/compose-schema-report.json';
  if (fs.existsSync(composeReport)){
    const r = JSON.parse(fs.readFileSync(composeReport,'utf8'));
    if (Array.isArray(r.errors) && r.errors.length>0) fail('compose schema errors detected');
  }
  const missingReport = 'reports/validation/missing-required.json';
  if (fs.existsSync(missingReport)){
    const r = JSON.parse(fs.readFileSync(missingReport,'utf8'));
    if (Array.isArray(r.missing) && r.missing.length>0) fail('drivers missing required files');
  }
  ok('pipeline health OK');
})();
