#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const TEST_FILE = path.join(__dirname, 'test', 'unit', 'tuya-ts0011.test.js');
const MOCHA_PATH = path.join(__dirname, 'node_modules', '.bin', 'mocha');

// Run the test
console.log(`Running tests in: ${TEST_FILE}`);

const testProcess = spawn('node', [
  MOCHA_PATH,
  TEST_FILE,
  '--timeout', '10000',
  '--exit',
  '--reporter', 'spec',
  '--require', '@babel/register'
], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

testProcess.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});
