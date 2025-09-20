'use strict';

const figures = require('figures');
const colors = require('colors');

module.exports = (...props) => {
  // Replace every prop's symbols to platform-specific symbols
  for (const [key, value] of Object.entries(props)) {
    props[key] = figures(value instanceof Error ? (value.message || value.toString()) : value);
  }

  // eslint-disable-next-line no-console
  console.log(...props);
};

module.exports.info = (...props) => {
  module.exports(colors.grey(...props));
};

module.exports.success = (...props) => {
  module.exports(colors.green('✓', ...props));
};

module.exports.warning = (...props) => {
  module.exports(colors.yellow('ℹ', ...props));
};

module.exports.error = (...props) => {
  // Replace Error with Error.message
  for (const [key, value] of Object.entries(props)) {
    if (value instanceof Error) {
      props[key] = value.message ?? value.toString();
    }
  }

  module.exports(colors.red('✖', ...props));
};
