import open from 'open';

import Log from '../../../../lib/Log.js';
import AthomApi from '../../../../services/AthomApi.js';

function getRequestedHomeyId(argv) {
  if (typeof argv.homeyId === 'string' && argv.homeyId.length > 0) {
    return argv.homeyId;
  }

  return null;
}

async function resolveHomeyId(argv, homeyService = AthomApi) {
  const requestedHomeyId = getRequestedHomeyId(argv);

  if (requestedHomeyId) {
    return requestedHomeyId;
  }

  const activeHomey = await homeyService.getSelectedHomey();

  if (!activeHomey?.id) {
    throw new Error('No active Homey selected. Run `homey select` to choose one.');
  }

  return activeHomey.id;
}

export async function openDeviceInWebApp({ argv, openUrl = open, homeyService = AthomApi }) {
  const homeyId = await resolveHomeyId(argv, homeyService);
  const deviceId = String(argv.id || '').trim();

  if (!deviceId) {
    throw new Error('Missing required option: --id');
  }

  const url = `https://my.homey.app/homeys/${encodeURIComponent(homeyId)}/devices/${encodeURIComponent(deviceId)}`;

  Log.success(`Opening URL: ${url}`);
  await openUrl(url);

  return url;
}

export default {
  description: 'Devices manager operations',
  commands: [
    {
      command: 'open-device',
      describe: 'Open a device in the Homey web app',
      builder: (yargs, context) => {
        return context.applyHomeyIdOption(yargs).option('id', {
          alias: 'i',
          type: 'string',
          demandOption: true,
          description: 'Device id to open in the Homey web app',
        });
      },
      handler: async (argv) => {
        await openDeviceInWebApp({ argv });
      },
    },
  ],
};
