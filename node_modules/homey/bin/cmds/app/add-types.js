'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Install the Apps SDK TypeScript declarations';
exports.handler = async yargs => {
  try {
    await App.addTypes({ appPath: yargs.path });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
