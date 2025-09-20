'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Add GitHub Workflows (validate, update version, publish)';
exports.handler = async yargs => {
  try {
    await App.addGitHubWorkflows({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
