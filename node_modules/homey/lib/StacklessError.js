'use strict';

module.exports = class StacklessError extends Error {
  constructor(...args) {
    super(...args);
    this.stack = undefined;
  }
};
