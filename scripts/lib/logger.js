'use strict';

function createLogger(prefix, options = {}) {
  let errors = 0, warnings = 0;
  function log(type, context, msg) {
    const icon = type === 'error' ? '\u274C' : type === 'warn' ? '\u26A0\uFE0F' : '\u2705';
    if (!options.silent) {
      console.log(icon + ' [' + context + '] ' + msg);
    }
    if (type === 'error') errors++;
    if (type === 'warn') warnings++;
  }
  function summary() {
    if (!options.silent) {
      console.log('\n\uD83D\uDCCA ' + (prefix || '') + ' ' + errors + ' errors, ' + warnings + ' warnings');
    }
    return { errors, warnings };
  }
  return { log, summary, get errors() { return errors; }, get warnings() { return warnings; } };
}

module.exports = { createLogger };
