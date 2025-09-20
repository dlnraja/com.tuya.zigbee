'use strict';

const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'Log in with an Athom account';
exports.handler = async yargs => {
  try {
    await AthomApi.login();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
