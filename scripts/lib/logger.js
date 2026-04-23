'use strict';

function createLogger(prefix) {
  let errors = 0, warnings = 0;
  function log(type, context, msg) {
    const icon = type === 'error' ? '\u274C' : type === 'warn' ? '\u26A0\uFE0F' : '\u2705'      ;
    console.log(icon + ' [' + context + '] ' + msg);
    if (type === 'error') errors++;
    if (type === 'warn') warnings++;
  }
  function summary() {
    console.log('\n\uD83D\uDCCA ' + (prefix || '') + ' ' + errors + ' errors, ' + warnings + ' warnings');
    return { errors, warnings };
  }
  return { log, summary, get errors() { return errors; }, get warnings() { return warnings; } };
}

module.exports = { createLogger };
