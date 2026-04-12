import open from 'open';
import Log from '../../../lib/Log.js';
import App from '../../../lib/App.js';

export const desc = 'View your app in the Homey Developer Tools';
export const handler = async (yargs) => {
  try {
    const manifest = App.getManifest({ appPath: yargs.path });
    const url = `https://tools.developer.homey.app/apps/app/${manifest.id}`;
    Log.success(`Opening URL: ${url}`);
    open(url);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
