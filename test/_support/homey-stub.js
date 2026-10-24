'use strict';
/**
 * P3020: in this repo `require('homey')` resolves to the Homey CLI package (devDependency), whose
 * main file is the CLI entry: loading it parses process.argv with yargs and sets a failing exit code
 * ("Not enough non-option arguments"). Under `node --test` that turns a file whose assertions all pass
 * into a failed file. Tests that load homey-zigbeedriver (which requires 'homey') call this first: it
 * registers a minimal SDK-shaped module in the require cache, only when the resolved module is the CLI.
 */
const { EventEmitter } = require('events');
const path = require('path');

function install() {
  let resolved;
  try { resolved = require.resolve('homey'); } catch (_e) { return false; }
  const isCli = /[\\/]bin[\\/]homey\.js$/.test(resolved) || resolved.endsWith(`${path.sep}homey.js`);
  if (!isCli) { return false; }
  if (require.cache[resolved] && require.cache[resolved].exports && require.cache[resolved].exports.__p3020Stub) {
    return true;
  }
  class SimpleClass extends EventEmitter {
    log(...a) { if (process.env.P3020_STUB_LOG) { console.log(...a); } }
    error(...a) { if (process.env.P3020_STUB_LOG) { console.error(...a); } }
  }
  class Device extends SimpleClass {}
  class Driver extends SimpleClass {}
  class App extends SimpleClass {}
  const exportsObj = { __p3020Stub: true, SimpleClass, Device, Driver, App, env: {}, manifest: {} };
  const m = new (require('module'))(resolved);
  m.filename = resolved; m.loaded = true; m.exports = exportsObj;
  require.cache[resolved] = m;
  return true;
}

module.exports = { install };
install();
