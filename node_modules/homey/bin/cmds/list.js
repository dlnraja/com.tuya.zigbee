'use strict';

const Table = require('cli-table');
const colors = require('colors');
const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'List all Homeys';
exports.handler = async () => {
  try {
    const homeys = await AthomApi.getHomeys();

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
      ].map(title => colors.white.bold(title)),
    });

    homeys.sort((a, b) => {
      return -(a.state || '').localeCompare((b.state || ''));
    });

    homeys.forEach(homey => {
      table.push([
        homey.id,
        homey.name,
        homey.platform,
        homey.platformVersion,
        homey.softwareVersion,
        homey.apiVersion,
        homey.language,
        homey.users && homey.users.length,
        homey.role,
        homey.region || '-',
        homey.usb ? 'Yes' : '-',
      ].map(value => value || '-'));
    });

    Log(table.toString());
    process.exit(0);
  } catch (err) {
    Log.error(err.stack);
    process.exit(1);
  }
};
