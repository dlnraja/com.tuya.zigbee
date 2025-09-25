'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Migrate app to Homey compose';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.migrateToCompose();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
