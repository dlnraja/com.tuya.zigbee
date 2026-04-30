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
let promptCount = 0;

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
  
  // Auto-answer interactive prompts
  if (text.includes('Are you sure you want to continue')) {
    child.stdin.write('y\n');
    promptCount++;
  }
  if (text.includes('I have read the Homey App Store guidelines')) {
    child.stdin.write('y\n');
    promptCount++;
  }
  if (text.includes('publish directly after approval')) {
    child.stdin.write('n\n');
    promptCount++;
  }
  if (text.includes('certification')) {
    child.stdin.write('y\n');
    promptCount++;
  }
  // Generic y/N prompts
  if (text.match(/\?\s+.*\(y\/N\)/i) && promptCount < 10) {
    child.stdin.write('y\n');
    promptCount++;
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