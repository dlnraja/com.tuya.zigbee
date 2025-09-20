'use strict';

const colors = require('colors');
const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'Show the current logged in user';
exports.handler = async yargs => {
  try {
    const profile = await AthomApi.getProfile();
    Log(`${profile.firstname} ${profile.lastname} <${profile.email}>`);

    if (profile.hasRole('app_developer_trusted')) {
      Log(`${colors.cyan('(✔)')} ${colors.white('Verified Developer')}`);
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
