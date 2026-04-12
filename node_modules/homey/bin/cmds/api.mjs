import { getHomeyManagerDefinitions } from '../../lib/api/ApiCommandDefinition.mjs';
import { loadHomeyManagerCommandExtension } from '../../lib/api/ApiManagerExtension.mjs';
import { createHomeyManagerCommand } from '../../lib/api/ApiManagerCommand.mjs';
import * as diagnoseCommand from './api/diagnose.mjs';
import * as rawCommand from './api/raw.mjs';
import {
  builder as schemaBuilder,
  desc as schemaDesc,
  handler as schemaHandler,
} from './api/schema.mjs';

const managerCommands = getHomeyManagerDefinitions().map((managerDefinition) => {
  const extension = loadHomeyManagerCommandExtension(managerDefinition.managerIdCamelCase);

  return createHomeyManagerCommand({
    managerDefinition,
    extension,
  });
});

export const desc = 'Direct Homey API commands';
export const builder = (yargs) => {
  const apiYargs = yargs;

  apiYargs.command(diagnoseCommand);
  apiYargs.command(rawCommand);
  apiYargs.command('schema', schemaDesc, schemaBuilder, schemaHandler);

  managerCommands.forEach((managerCommand) => {
    apiYargs.command(managerCommand);
  });

  return apiYargs.demandCommand().help();
};
