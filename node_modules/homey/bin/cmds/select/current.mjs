import { logJsonError, printStructuredOutput } from '../../../lib/CliOutput.mjs';
import { applyJqOutputOption, applyJsonOutputOption } from '../../../lib/api/ApiCommandOptions.mjs';
import Log from '../../../lib/Log.js';
import AthomApi from '../../../services/AthomApi.js';

export const desc = 'Show the currently selected Homey';

function printCurrentHomey(activeHomey) {
  if (!activeHomey) {
    Log('No active Homey selected. Run `homey select` to choose one.');
    return;
  }

  Log(`Active Homey: ${activeHomey.name} (${activeHomey.id})`);
}

export const builder = (yargs) => {
  return applyJqOutputOption(applyJsonOutputOption(yargs))
    .example('$0 select current', 'Show the active Homey')
    .example('$0 select current --json', 'Output the active Homey as JSON')
    .example("$0 select current --jq '.name'", 'Print the active Homey name using jq')
    .help();
};

export const handler = async (argv = {}) => {
  try {
    const activeHomey = (await AthomApi.getSelectedHomey()) ?? null;

    printStructuredOutput({
      value: activeHomey,
      argv,
      printHuman: () => printCurrentHomey(activeHomey),
    });

    process.exit(0);
  } catch (err) {
    logJsonError(err, argv);
    process.exit(1);
  }
};
