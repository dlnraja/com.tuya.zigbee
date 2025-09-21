'use strict';

const Table = require('cli-table');
const colors = require('colors');
const { Log } = require('../../index');
const { AthomApi } = require('../../index');

exports.desc = 'List all Homeys';
exports.handler = async () => {
  try {
    const homeys = await AthomApi.getHomeys();

    const table = new Table({
      head: [
        'ID',
        'Name',
        'Version',
        'API',
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
        homey._id,
        homey.name,
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
  } catch (err) {
    Log(colors.red(err.message));
  }
};
