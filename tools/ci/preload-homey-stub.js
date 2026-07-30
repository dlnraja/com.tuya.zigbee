'use strict';

/**
 * Preloader for lib-smoke-test: redirects require('homey') to the SDK stub
 * (node_modules contains the homey CLI, which shadows NODE_PATH fallbacks).
 */
const Module = require('module');
const path = require('path');

const STUB = path.join(__dirname, 'stubs', 'homey.js');
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, ...args) {
  if (request === 'homey') {return STUB;}
  return originalResolve.call(this, request, ...args);
};
