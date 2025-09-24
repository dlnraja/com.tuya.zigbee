'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Create a new Homey App';
exports.handler = async yargs => {
  try {
    await App.create({ appPath: yargs.path });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
