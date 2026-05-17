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

  // Precision State-Machine Answers
  if (text.includes('uncommitted changes') && !answered.uncommitted) {
    child.stdin.write('y\n');
    answered.uncommitted = true;
  }
  if (text.includes('App Store guidelines') && !answered.guidelines) {
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
  if (text.includes("What's new in Tuya Unified") && !answered.changelog) {
    child.stdin.write('Fix all duplicate flow cards, resolve unclosed braces, correct root app icon dimensions and validate SDK3 compliance\n');
    answered.changelog = true;
  }
  if (text.includes('commit the version bump') && !answered.commitBump) {
    child.stdin.write('y\n');
    answered.commitBump = true;
  }
  if (text.includes('push the local changes to') && !answered.pushChanges) {
    child.stdin.write('y\n');
    answered.pushChanges = true;
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

setTimeout(() => { child.kill(); process.exit(1); }, 900000);