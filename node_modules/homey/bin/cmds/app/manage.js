'use strict';

const open = require('open');
const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'View your app in the Homey Developer Tools';
exports.handler = async yargs => {
  try {
    const manifest = App.getManifest({ appPath: yargs.path });
    const url = `https://tools.developer.homey.app/apps/app/${manifest.id}`;
    Log.success(`Opening URL: ${url}`);
    open(url);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
