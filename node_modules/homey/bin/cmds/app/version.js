'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.command = 'version <next>';
exports.desc = 'Update a Homey App\'s version';
exports.builder = yargs => {
  return yargs.positional('next', {
    describe: 'patch/minor/major or semver',
    type: 'string',
  });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.version(yargs.next);
  } catch (err) {
    Log(colors.red(err.message));
  }
};
