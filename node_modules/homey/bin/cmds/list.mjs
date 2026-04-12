import Table from 'cli-table';
import colors from 'colors';
import { printStructuredOutput, logJsonError } from '../../lib/CliOutput.mjs';
import { applyJqOutputOption, applyJsonOutputOption } from '../../lib/api/ApiCommandOptions.mjs';
import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'List all Homeys';

function sortHomeys(homeys) {
  return [...homeys].sort((a, b) => {
    return -(a.state || '').localeCompare(b.state || '');
  });
}

function toHomeyOutput(homey) {
  return {
    id: homey.id ?? null,
    name: homey.name ?? null,
    platform: homey.platform ?? null,
    platformVersion: homey.platformVersion ?? null,
    softwareVersion: homey.softwareVersion ?? null,
    apiVersion: homey.apiVersion ?? null,
    language: homey.language ?? null,
    usersCount: Array.isArray(homey.users) ? homey.users.length : 0,
    role: homey.role ?? null,
    region: homey.region ?? null,
    usbAddress: homey.usb ?? null,
    state: homey.state ?? null,
  };
}

function printHomeysTable(homeys) {
  const table = new Table({
    head: [
      'ID',
      'Name',
      'Platform',
      'Platform Version',
      'Software Version',
      'API Version',
      'Language',
      'Users',
      'Role',
      'Region',
      'USB',
    ].map((title) => colors.white.bold(title)),
  });

  homeys.forEach((homey) => {
    table.push(
      [
        homey.id,
        homey.name,
        homey.platform,
        homey.platformVersion,
        homey.softwareVersion,
        homey.apiVersion,
        homey.language,
        homey.usersCount || '-',
        homey.role,
        homey.region || '-',
        homey.usbAddress ? 'Yes' : '-',
      ].map((value) => value || '-'),
    );
  });

  Log(table.toString());
}

export const builder = (yargs) => {
  return applyJqOutputOption(applyJsonOutputOption(yargs))
    .example('$0 list --json', 'Output Homeys as JSON')
    .example("$0 list --jq '.[].name'", 'Print all Homey names using jq')
    .help();
};

export const handler = async (argv = {}) => {
  try {
    const homeys = sortHomeys(await AthomApi.getHomeys()).map(toHomeyOutput);

    printStructuredOutput({
      value: homeys,
      argv,
      printHuman: () => printHomeysTable(homeys),
    });

    process.exit(0);
  } catch (err) {
    logJsonError(err, argv);
    process.exit(1);
  }
};
