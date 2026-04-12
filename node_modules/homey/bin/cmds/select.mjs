import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Select a Homey as active';
export const builder = (yargs) => {
  return yargs
    .commandDir('select', {
      extensions: ['.mjs'],
    })
    .option('id', {
      alias: 'i',
      desc: 'ID of the Homey',
      type: 'string',
    })
    .option('name', {
      alias: 'n',
      desc: 'Name of the Homey',
      type: 'string',
    })
    .example('$0 select --id <HOMEY_ID>', 'Select a Homey by id')
    .example('$0 select current --json', 'Show the currently selected Homey as JSON')
    .help();
};

export const handler = async (argv) => {
  try {
    await AthomApi.selectActiveHomey({
      id: argv.id,
      name: argv.name,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
