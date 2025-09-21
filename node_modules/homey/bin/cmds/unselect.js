'use strict';

const colors = require('colors');
const { Log } = require('../../index');
const { AthomApi } = require('../../index');

exports.desc = 'Unselect the active Homey';
exports.handler = async () => {
  try {
    await AthomApi.unselectActiveHomey();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
