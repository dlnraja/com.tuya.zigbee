'use strict';

const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'Log out the current user';
exports.handler = async yargs => {
  try {
    await AthomApi.logout();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
