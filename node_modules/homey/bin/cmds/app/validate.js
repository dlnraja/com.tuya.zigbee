'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Validate a Homey App';
exports.builder = yargs => {
  return yargs.option('level', {
    alias: 'l',
    default: 'publish',
    type: 'string',
    description: 'Validation level. Can be: debug, publish, verified.',
  });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.preprocess();
    await app.validate({
      level: yargs.level,
    });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
