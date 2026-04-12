import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';

export const desc = 'Create a new Driver';
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.createDriver();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
