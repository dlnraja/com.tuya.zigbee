#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting interactive homey app publish...');
console.log('App ID:', require('../app.json').id);
console.log('Version:', require('../app.json').version);

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
  
  // State-machine auto-answer interactive prompts (exactly once each)
  if (text.includes("What's new in Tuya Unified") && !answered.changelog) {
    child.stdin.write('Fix clamp ammeter incoherent watt/voltage scaling, add SONOFF wireless button matching, and ensure SDK3 compliance\n');
    answered.changelog = true;
  }
  if (text.includes('Are you sure you want to continue') && !answered.continue) {
    child.stdin.write('y\n');
    answered.continue = true;
  }
  if (text.includes('I have read the Homey App Store guidelines') && !answered.guidelines) {
    child.stdin.write('y\n');
    answered.guidelines = true;
  }
  if (text.includes('update your app') && !answered.updateApp) {
    child.stdin.write('n\n');
    answered.updateApp = true;
  }
  if (text.includes('Select the desired version') && !answered.selectVersion) {
    setTimeout(() => child.stdin.write('\n'), 500);
    answered.selectVersion = true;
  }
  if (text.includes('publish directly after approval') && !answered.publishDirectly) {
    child.stdin.write('n\n');
    answered.publishDirectly = true;
  }
  if (text.includes('certification') && !answered.certification) {
    child.stdin.write('y\n');
    answered.certification = true;
  }
  if (text.includes('commit the version bump') && !answered.commitBump) {
    child.stdin.write('y\n');
    answered.commitBump = true;
  }
  if (text.includes('push the local changes to') && !answered.pushChanges) {
    child.stdin.write('y\n');
    answered.pushChanges = true;
  }
  // Generic y/N prompts (if any missed)
  if (text.match(/\([yY]\/[nN]\)/) && !answered.generic) {
    child.stdin.write('y\n');
    answered.generic = true;
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  console.log('\nPublish process exited with code:', code);
  if (code === 0) {
    console.log('SUCCESS: App published!');
  } else {
    console.log('Output:', output.slice(-500));
  }
  process.exit(code || 0);
});

// Timeout after 5 minutes
setTimeout(() => {
  console.log('Timeout reached, killing process...');
  child.kill();
  process.exit(1);
}, 300000);