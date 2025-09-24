'use strict';

const colors = require('colors');
const { Log } = require('../../../..');
const { App } = require('../../../..');

exports.desc = 'Create a new Driver';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.createDriver();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
