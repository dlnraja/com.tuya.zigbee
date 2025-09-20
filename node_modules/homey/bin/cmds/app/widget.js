'use strict';

exports.desc = 'Widget related commands';
exports.builder = yargs => {
  return yargs
    .commandDir('widget')
    .demandCommand()
    .help();
};
