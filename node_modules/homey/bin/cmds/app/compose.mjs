import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';

export const desc = 'Migrate app to Homey compose';
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.migrateToCompose();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
