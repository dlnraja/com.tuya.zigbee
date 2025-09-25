'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Build a Homey App for publishing';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.build();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
