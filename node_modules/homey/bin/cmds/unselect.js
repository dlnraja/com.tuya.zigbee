'use strict';

const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'Unselect the active Homey';
exports.handler = async () => {
  try {
    await AthomApi.unselectActiveHomey();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
