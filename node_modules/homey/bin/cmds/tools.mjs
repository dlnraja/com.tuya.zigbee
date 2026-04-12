import open from 'open';
import Log from '../../lib/Log.js';

export const desc = 'Open Homey Developer Tools';
export const handler = async () => {
  try {
    const url = 'https://tools.developer.homey.app';
    Log.success(`Opening URL: ${url}`);
    await open(url);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
