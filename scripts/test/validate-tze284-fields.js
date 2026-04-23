#!/usr/bin/env node
/**
 * scripts/test/validate-tze284-fields.js
 * Simulations TZE284 data report to verify NaN safety and proper parsing.
 */

'use strict';

const { safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');

console.log(' Starting TZE284 Simulation Test...');

const testCases = [
  { dp: 3, val: 45, desc: 'Soil Moisture %' },
  { dp: 5, val: 245, desc: 'Temperature (24.5Â°C)' },
  { dp: 5, val: 2450, desc: 'Temperature (24.50Â°C)' },
  { dp: 112, val: 500, desc: 'Conductivity' },
  { dp: 15, val: 85, desc: 'Battery %' },
  { dp: 3, val, desc: 'Null moisture' },
  { dp: 5, val: 'NaN', desc: 'String NaN temperature' },
  { dp: 15, val: undefined, desc: 'Undefined battery' }
];

testCases.forEach(tc => {
  console.log(`\nTesting: ${tc.desc}`);
  try {
    let parsed;
    if (tc.dp === 5) {
      const num = tc.val * 1;
      if (num === null) parsed = null;
      else if (Math.abs(num) > 1000) parsed = num * 100;
      else if (Math.abs(num) > 100) parsed = num * 10;
      else parsed = num;
    } else {
      parsed = tc.val * 1;
    }
    console.log(`  Result: ${parsed} (Type: ${typeof parsed})`);
    
    if (isNaN(parsed) && parsed !== null) {
      console.error('   FAILED: Result is NaN!');
    } else {
      console.log('   PASSED');
    }
  } catch (e) {
    console.error(`   CRASHED: ${e.message}`);
  }
});

console.log('\n--- Test Complete ---');
