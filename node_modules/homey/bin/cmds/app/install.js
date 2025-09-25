'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');
const AthomApi = require('../../../services/AthomApi');

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
    process.exit(0);
  } catch (err) {
    if (err instanceof Error && err.stack) {
      Log.error(err.stack);
    } else {
      Log.error(err);
    }
    process.exit(1);
  }
};
