import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';

export const desc = 'List the dependencies of a Homey app';
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.listDependencies();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
