import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Log in with an Athom account';
export const handler = async (yargs) => {
  try {
    await AthomApi.login();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
