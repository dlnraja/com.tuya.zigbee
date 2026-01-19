'use strict';
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(__dirname, '../../drivers');

let total=0, safe=0, risky=0;

fs.readdirSync(DRIVERS).forEach(d => {
  const cf = path.join(DRIVERS, d, 'driver.compose.json');
  if (!fs.existsSync(cf)) return;
  total++;
  const c = JSON.parse(fs.readFileSync(cf));
  const mfr = c.zigbee?.manufacturerName || [];
  const pid = c.zigbee?.productId || [];
  
  let status = '✅';
  let issues = [];
  
  if (mfr.length === 0) { issues.push('NO_MFR'); status = '❌'; }
  if (mfr.some(m => m.includes('generic'))) { issues.push('FAKE_MFR'); status = '⚠️'; }
  if (d === 'universal_fallback' && mfr.length < 5) { issues.push('FALLBACK_TOO_STRICT'); status = '❌'; }
  
  if (status === '✅') safe++;
  else if (status === '⚠️') risky++;
  
  if (issues.length) console.log(`${status} ${d}: ${issues.join(', ')}`);
});

console.log(`\n=== AUDIT COMPLETE ===`);
console.log(`Total: ${total} | Safe: ${safe} | Risky: ${total-safe}`);
