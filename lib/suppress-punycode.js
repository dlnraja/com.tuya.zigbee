/**
 * Suppress punycode deprecation warning (DEP0040)
 * 
 * The `punycode` built-in module is deprecated since Node.js 21 in favor of
 * userland alternatives. However, our transitive dependencies (whatwg-url@5,
 * tr46@0.0.3 via node-fetch@2) still use `require('punycode/')`.
 * 
 * This preload script suppresses ONLY the DEP0040 warning, keeping all other
 * deprecation warnings active. Load via: node -r ./lib/suppress-punycode.js
 * 
 * When node-fetch is eventually updated to v3+ (which uses native fetch),
 * this file can be removed.
 */
'use strict';

const originalEmit = process.emit;
process.emit = function (event, ...args) {
  if (
    event === 'warning' &&
    args[0]?.name === 'DeprecationWarning' &&
    args[0]?.code === 'DEP0040'
  ) {
    // Silently swallow the punycode deprecation
    return false;}
  return originalEmit.apply(this, [event, ...args]);
};


