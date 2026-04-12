import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';

export const desc = 'Create a new Homey App';
export const handler = async (yargs) => {
  try {
    await AppFactory.createNewAppInstance({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
