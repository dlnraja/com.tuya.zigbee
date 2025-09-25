#!/usr/bin/env node

'use strict';

const yargs = require('yargs');
const updateNotifier = require('update-notifier');
const semver = require('semver');

const pkg = require('../package.json');
const Log = require('../lib/Log');
const AthomMessage = require('../services/AthomMessage');

// Ensure the minimum Node.js version is high enough
const MINIMUM_NODE_VERSION = 'v16.0.0';

try {
  if (semver.lt(process.version, MINIMUM_NODE_VERSION)) {
    Log(`Homey CLI requires Node.js ${MINIMUM_NODE_VERSION} or higher.\nPlease upgrade your Node.js version and try again.`);
    return;
  }
} catch (err) {
  Log(`Failed to determine Node.js version, please make sure you're using version ${MINIMUM_NODE_VERSION} or higher.`);
  return;
}

(async () => {
  await AthomMessage.notify();
  updateNotifier({ pkg }).notify({
    isGlobal: true,
  });

  return yargs
    .commandDir('./cmds')
    .demandCommand()
    .strict()
    .help()
    .argv;
})();
