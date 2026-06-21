#!/usr/bin/env node
'use strict';
const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

console.log('Starting interactive homey app publish...');
console.log('App ID:', require('../app.json').id);
console.log('Version:', require('../app.json').version);

const publishDir = path.join(os.tmpdir(), 'homey-publish-temp');

// v9.0.54 FIX CRITICAL : npm install dans le dossier de publish
console.log('Installing dependencies in publish directory...');
try {
  execSync('npm install --omit=dev --no-audit --no-fund', { cwd: publishDir, stdio: 'inherit', timeout: 120000 });
  console.log('✅ Dependencies installed');
} catch (e) {
  console.error('⚠️ npm install failed, continuing anyway:', e.message);
}

const child = spawn('npx', ['homey', 'app', 'publish'], {
  cwd: publishDir,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let output = '';
const answered = {};

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
  if ((text.includes("What's new in") || text.includes("Changelog")) && !answered.changelog) {
    child.stdin.write('Bug fixes: buttons, battery, capability listeners, sdkVersion, HOBEIAN device support\n');
    answered.changelog = true;
  }
  if (text.includes('Are you sure you want to continue') && !answered.continue) { child.stdin.write('y\n'); answered.continue = true; }
  if (text.includes('I have read the Homey App Store guidelines') && !answered.guidelines) { child.stdin.write('y\n'); answered.guidelines = true; }
  if (text.includes('update your app') && !answered.updateApp) { child.stdin.write('n\n'); answered.updateApp = true; }
  if (text.includes('Select the desired version') && !answered.selectVersion) { setTimeout(() => child.stdin.write('\n'), 500); answered.selectVersion = true; }
  if (text.includes('publish directly after approval') && !answered.publishDirectly) { child.stdin.write('n\n'); answered.publishDirectly = true; }
  if (text.includes('certification') && !answered.certification) { child.stdin.write('y\n'); answered.certification = true; }
  if (text.includes('commit the version bump') && !answered.commitBump) { child.stdin.write('y\n'); answered.commitBump = true; }
  if (text.includes('push the local changes to') && !answered.pushChanges) { child.stdin.write('y\n'); answered.pushChanges = true; }
  if (text.match(/\([yY]\/[nN]\)/) && !answered.generic) { child.stdin.write('y\n'); answered.generic = true; }
});

child.stderr.on('data', (data) => { process.stderr.write(data); });
child.on('close', (code) => {
  console.log('\nPublish process exited with code:', code);
  if (code === 0) { console.log('SUCCESS: App published!'); }
  else { console.log('Output:', output.slice(-500)); }
  process.exit(code || 0);
});
setTimeout(() => { console.log('Timeout reached, killing process...'); child.kill(); process.exit(1); }, 300000);
