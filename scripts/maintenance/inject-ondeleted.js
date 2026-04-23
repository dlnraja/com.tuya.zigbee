#!/usr/bin/env node
/**
 * onDeleted() Cleanup Injector
 * Adds async onDeleted() method to class-based drivers that lack it.
 * Prevents memory leaks on Homey Pro when devices are removed.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
let has = 0, missing = 0, injected = 0, errors = 0, skipped = 0;

for (const d of fs.readdirSync(DDIR)) {
  const dev = path.join(DDIR, d, 'device.js');
  if (!fs.existsSync(dev)) continue;
  let code = fs.readFileSync(dev, 'utf8');
  if (code.length < 500) { skipped++; continue; } // skip skeletons

  if (/onDeleted|onUninit/.test(code)) { has++; continue; }
  if (!/class\s+\w+\s+extends/.test(code)) { skipped++; continue; }
  missing++;

  // Detect patterns that need cleanup
  const hasInterval = /setInterval|_interval|_timer|_poll/.test(code);
  const hasRawListener = /\.on\s*\(\s*['"](?:rx|raw)['"]/.test(code)      ;

  let cleanup = '\n\n  async onDeleted() {\n';
  if (hasInterval) {
    cleanup += '    // Clean up timers to prevent memory leaks\n';
    cleanup += '    if (this._interval) { clearInterval(this._interval); this._interval = null; }\n';
    cleanup += '    if (this._timer) { clearTimeout(this._timer); this._timer = null; }\n';
    cleanup += '    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }\n';
  }
  if (hasRawListener) {
    cleanup += '    // Clean up raw/rx listeners\n';
    cleanup += '    try { this.zclNode?.removeAllListeners() ; } catch (e) { /* ignore */ }\n';
  }
  cleanup += '    this.log(\'Device deleted, cleaning up\');\n';
  cleanup += '  }\n';

  // Find the last } that closes the class
  const classEnd = code.lastIndexOf('}');
  if (classEnd < 0) { errors++; continue; }

  const newCode = code.substring(0, classEnd) + cleanup + code.substring(classEnd);

  // Quick syntax check
  const opens = (newCode.match(/\{/g) || []).length;
  const closes = (newCode.match(/\}/g) || []).length;
  if (Math.abs(opens - closes) > 2) { errors++; continue; }

  fs.writeFileSync(dev, newCode);
  injected++;
}

console.log('=== onDeleted() Cleanup Injector ===');
console.log('Already had onDeleted:', has);
console.log('Were missing:', missing);
console.log('Injected:', injected);
console.log('Skipped (skeleton/non-class):', skipped);
console.log('Errors:', errors);
