/* eslint-disable global-require */

'use strict';

const figures = require('figures');

module.exports.Log = (...props) => {
  console.log(figures(...props));
};

module.exports.Util = require('./lib/Util');
module.exports.Settings = new (require('./lib/Settings'))();
module.exports.AthomApi = new (require('./lib/AthomApi'))();
module.exports.AthomMessage = new (require('./lib/AthomMessage'))();
module.exports.App = require('./lib/App');
