'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Run a Homey App in development mode';
exports.builder = yargs => {
  return yargs
    .option('clean', {
      alias: 'c',
      type: 'boolean',
      default: false,
      desc: 'Delete all userdata, paired devices etc. before running the app.',
    })
    .option('remote', {
      alias: 'r',
      type: 'boolean',
      default: false,
      desc: 'Upload the app to Homey Pro and run remotely, instead of a Docker container on this machine. Defaults to true for Homey Pro 2019 and earlier.',
    })
    .option('skip-build', {
      alias: 's',
      type: 'boolean',
      default: false,
      desc: 'Skip the automatic build step.',
    })
    .option('link-modules', {
      alias: 'l',
      type: 'string',
      default: '',
      desc: 'Provide a comma-separated path to local Node.js modules to link. Only works when running the app inside Docker.',
    });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.run({
      remote: yargs.remote,
      clean: yargs.clean,
      skipBuild: yargs.skipBuild,
      linkModules: yargs.linkModules,
    });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
