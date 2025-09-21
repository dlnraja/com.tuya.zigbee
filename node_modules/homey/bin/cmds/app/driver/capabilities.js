'use strict';

const colors = require('colors');
const { Log } = require('../../../..');
const { App } = require('../../../..');

exports.desc = 'Change the capabilities of a Driver';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.changeDriverCapabilities();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
