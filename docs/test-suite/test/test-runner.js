#!/usr/bin/env node
'use strict';

const Mocha = require('mocha');
const path = require('path');

// Create a new Mocha instance
const mocha = new Mocha({
  timeout: 10000, // 10 second timeout
  reporter: 'spec',
  require: [
    'ts-node/register',
    'tsconfig-paths/register',
    'source-map-support/register'
  ]
});

// Add test files
mocha.addFile(path.join(__dirname, 'tuya_plug.test.ts'));
mocha.addFile(path.join(__dirname, 'driver.test.ts'));

// Run the tests
mocha.run((failures) => {
  process.exit(failures ? 1 : 0);
});
