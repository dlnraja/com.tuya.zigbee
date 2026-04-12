import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Log out the current user';
export const handler = async (yargs) => {
  try {
    await AthomApi.logout();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
