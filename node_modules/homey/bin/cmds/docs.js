'use strict';

const open = require('open');
const Log = require('../../lib/Log');

exports.desc = 'Open Homey Developer Documentation';
exports.handler = async yargs => {
  try {
    const url = 'https://apps.developer.homey.app';
    Log.success(`Opening URL: ${url}`);
    await open(url);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
