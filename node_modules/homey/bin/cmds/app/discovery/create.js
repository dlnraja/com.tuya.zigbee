'use strict';

const colors = require('colors');
const { Log } = require('../../../..');
const { App } = require('../../../..');

exports.desc = 'Create a new Discovery strategy';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.createDiscoveryStrategy();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
