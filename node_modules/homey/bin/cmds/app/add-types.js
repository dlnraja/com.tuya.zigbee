'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Install the Apps SDK TypeScript declarations';
exports.handler = async yargs => {
  try {
    await App.addTypes({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
