#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const app = require('../app.json');
console.log('Publishing:', app.id, 'v' + app.version);
const child = spawn('npx', ['homey', 'app', 'publish'], {
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});
let step = 0;
child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  if (text.includes('uncommitted changes') && step === 0) { child.stdin.write('y\n'); step = 1; }
  if (text.includes('App Store guidelines') && step <= 1) { child.stdin.write('y\n'); step = 2; }
  if (text.includes('update your app') && step <= 2) { child.stdin.write('n\n'); step = 3; }
  if (text.includes("What's new") || text.includes('Changelog')) { child.stdin.write('Bug fixes and stability improvements\n'); step = 4; }
  if (text.match(/\(y\/N\)/i) && step >= 3) { child.stdin.write('y\n'); }
  if (text.match(/\(Y\/n\)/i) && step >= 3) { child.stdin.write('y\n'); }
});
child.stderr.on('data', (data) => process.stderr.write(data));
child.on('close', (code) => { console.log('\nExit code:', code); process.exit(code || 0); });
setTimeout(() => { child.kill(); process.exit(1); }, 300000);