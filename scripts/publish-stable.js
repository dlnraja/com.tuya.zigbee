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

let output = '';
const answered = {};

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);

  // Step 1: uncommitted changes
  if (text.includes('uncommitted changes') && !answered.uncommitted) {
    child.stdin.write('y\n');
    answered.uncommitted = true;
  }
  // Step 2: guidelines
  if (text.includes('App Store guidelines') && !answered.guidelines) {
    child.stdin.write('y\n');
    answered.guidelines = true;
  }
  // Step 3: version number update - say NO to keep current version
  if (text.includes('update your app') && !answered.updateApp) {
    child.stdin.write('n\n');
    answered.updateApp = true;
  }
  // Step 4: version selection (arrow keys) - send Enter to select Patch
  if (text.includes('Select the desired version') && !answered.selectVersion) {
    // Send Enter to select the first option (Patch)
    setTimeout(() => child.stdin.write('\n'), 500);
    answered.selectVersion = true;
  }
  // Step 5: changelog prompt
  if (text.includes("What's new in Tuya Unified") && !answered.changelog) {
    child.stdin.write('Fix clamp ammeter incoherent watt/voltage scaling, add SONOFF wireless button matching, and ensure SDK3 compliance\n');
    answered.changelog = true;
  }
  // Step 6: push to origin prompt
  if (text.includes('push the local changes to') && !answered.pushChanges) {
    child.stdin.write('y\n');
    answered.pushChanges = true;
  }
  // Step 7: any remaining y/N
  if (text.match(/\(y\/N\)/i) && !answered.genericYesNo) {
    child.stdin.write('y\n');
    answered.genericYesNo = true;
  }
  if (text.match(/\(Y\/n\)/i) && !answered.genericYesNo2) {
    child.stdin.write('y\n');
    answered.genericYesNo2 = true;
  }
});

child.stderr.on('data', (data) => process.stderr.write(data));

child.on('close', (code) => {
  console.log('\nExit code:', code);
  if (output.includes('Published') || output.includes('success') || code === 0) {
    console.log('SUCCESS: App published!');
  }
  process.exit(code || 0);
});

setTimeout(() => { child.kill(); process.exit(1); }, 300000);