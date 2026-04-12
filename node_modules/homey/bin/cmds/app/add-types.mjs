import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';

export const desc = 'Install the Apps SDK type declarations';
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.constructor.addTypes({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
