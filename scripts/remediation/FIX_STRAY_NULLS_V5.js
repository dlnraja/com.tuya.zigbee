#!/usr/bin/env node
/**
 * FIX_STRAY_NULLS_V5.js — backward-compat shim
 * ---------------------------------------------------------------
 * The V2..V6 files were empty stubs ('use strict';). To preserve any
 * external call sites (CI workflows, docs) that may reference a
 * specific version, each now delegates to the single real
 * implementation in FIX_STRAY_NULLS.js (which itself calls
 * scripts/maintenance/kill-stray-nulls.cjs).
 *
 * There is no behavioural difference between V1..V6 anymore. The
 * versioned filenames (V2-V6) are kept only so old references keep working.
 * ---------------------------------------------------------------
 */
'use strict';
const path = require('path');
// Delegate: load V1's module. When this shim is the main module, V1
// runs its main() because V1 checks require.main === module at load
// time — but since we are the main module, we re-invoke V1's main
// logic by spawning it as a child to avoid double-execution edge cases.
if (require.main === module) {
  const { spawn } = require('child_process');
  const args = process.argv.slice(2);
  const child = spawn(process.execPath,
    [path.join(__dirname, 'FIX_STRAY_NULLS.js'), ...args],
    { stdio: 'inherit', windowsHide: true });
  child.on('exit', code => process.exit(code || 0));
  child.on('error', err => { console.error(err); process.exit(2); });
} else {
  module.exports = require(path.join(__dirname, 'FIX_STRAY_NULLS.js'));
}
