'use strict';

const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'Select a Homey as active';
exports.builder = yargs => {
  yargs
    .option('id', {
      alias: 'i',
      desc: 'ID of the Homey',
      type: 'string',
    })
    .option('name', {
      alias: 'n',
      desc: 'Name of the Homey',
      type: 'string',
    });
};

exports.handler = async yargs => {
  try {
    await AthomApi.selectActiveHomey({
      id: yargs.id,
      name: yargs.name,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
