import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';
import AthomApi from '../../../services/AthomApi.js';

export const desc = 'Install a Homey App';
export const builder = (yargs) => {
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
export const handler = async (yargs) => {
  try {
    const homey = await AthomApi.getActiveHomey();
    const app = AppFactory.getAppInstance(yargs.path);
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
