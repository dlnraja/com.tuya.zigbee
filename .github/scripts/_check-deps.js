#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname);
const builtins = new Set(['fs','path','os','url','http','https','crypto','child_process','util','stream','events','querystring','zlib','net','tls','assert','buffer','string_decoder','readline','dns','dgram','cluster','worker_threads','perf_hooks','v8','vm','module','process','console','timers','node:fs','node:path','node:os','node:url','node:http','node:https','node:crypto','node:child_process','node:util','node:stream','node:events','node:querystring','node:zlib','node:net','node:tls','node:assert','node:buffer','node:readline']);

const scripts = ['gmail-token-keepalive.js','scan-forks-recursive.js','scan-forum.js',
  'forum-respond-requests.js','fetch-gmail-diagnostics.js','homey-device-diagnostics.js',
  'generate-ai-changelog.js','upstream-triage.js','weekly-fingerprint-sync.js',
  'forum-activity-scraper.js','external-sources-scanner.js','enrichment-scanner.js',
  'scan-johan-full.js','auto-promote-puppeteer.js','auto-publish-draft.js',
  'nightly-processor.js','github-scanner.js','ai-helper.js'];

for (const s of scripts) {
  const f = path.join(dir, s);
  if (!fs.existsSync(f)) { console.log('MISSING: ' + s); continue; }
  const c = fs.readFileSync(f, 'utf8');
  const reqs = [];
  const re = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    const dep = m[1];
    if (!dep.startsWith('.') && !dep.startsWith('/') && !builtins.has(dep) && !builtins.has('node:' + dep)) {
      reqs.push(dep);
    }
  }
  const unique = [...new Set(reqs)];
  console.log(s + ': ' + (unique.length ? 'NEEDS npm: ' + unique.join(', ') : 'built-in only'));
}
