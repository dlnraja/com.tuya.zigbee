import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';

export const desc = 'Change the capabilities of a Driver';
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.changeDriverCapabilities();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
