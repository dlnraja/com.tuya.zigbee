import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Unselect the active Homey';
export const handler = async () => {
  try {
    await AthomApi.unselectActiveHomey();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
