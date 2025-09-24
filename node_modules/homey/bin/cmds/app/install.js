'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');
const { AthomApi } = require('../../..');

exports.desc = 'Install a Homey App';
exports.builder = yargs => {
  return yargs
    .option('clean', {
      alias: 'c',
      type: 'boolean',
      default: false,
    })
    .option('skip-build', {
      alias: 's',
      type: 'boolean',
      default: false,
    });
};
exports.handler = async yargs => {
  try {
    const homey = await AthomApi.getActiveHomey();
    const app = new App(yargs.path);
    await app.install({
      homey,
      clean: yargs.clean,
      skipBuild: yargs.skipBuild,
    });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
