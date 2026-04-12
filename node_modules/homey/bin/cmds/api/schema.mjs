import {
  buildSchemaCommand,
  executeSchemaCommand,
  logSchemaCommandError,
} from '../../../lib/api/ApiSchemaCommand.mjs';

export const desc = 'Inspect available Homey API managers and operations';
export const builder = (yargs) => {
  return buildSchemaCommand(yargs)
    .example(
      '$0 api schema',
      'Print a human-readable overview of the available Homey API operations',
    )
    .example("$0 api schema --json --jq '.managers | keys'", 'List manager keys using jq')
    .help();
};

export const handler = async (argv) => {
  try {
    await executeSchemaCommand(argv);
    process.exit(0);
  } catch (err) {
    logSchemaCommandError(err, argv);
    process.exit(1);
  }
};
