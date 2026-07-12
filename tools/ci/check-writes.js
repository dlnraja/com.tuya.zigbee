#!/usr/bin/env node
// check-writes.js
const fs = require('fs');

console.log('=== sync-johan-sdk3.js ===');
const c1 = fs.readFileSync('.github/scripts/sync-johan-sdk3.js', 'utf8');
console.log('Has git push to Johan:', /git\s+push.*JohanBendz/.test(c1));
console.log('Has gh pr create Johan:', /gh\s+pr\s+create.*JohanBendz/.test(c1));
console.log('Has gh issue create Johan:', /gh\s+issue\s+create.*JohanBendz/.test(c1));
console.log('Has POST /repos/JohanBendz/issues/comments:', /repos\/JohanBendz\/issues\/comments/.test(c1));
console.log('Has upstream push:', /push.*upstream/i.test(c1));
console.log('Has origin push:', /push.*origin/i.test(c1));

console.log('\n=== auto-driver-scaffold.js ===');
const c2 = fs.readFileSync('.github/scripts/auto-driver-scaffold.js', 'utf8');
console.log('Has git push to Johan:', /git\s+push.*JohanBendz/.test(c2));
console.log('Has gh pr create Johan:', /gh\s+pr\s+create.*JohanBendz/.test(c2));
console.log('Has gh issue create Johan:', /gh\s+issue\s+create.*JohanBendz/.test(c2));
console.log('Has upstream push:', /push.*upstream/i.test(c2));

console.log('\n=== johan-shadow-audit.js ===');
const c3 = fs.readFileSync('.diag/johan-shadow-audit.js', 'utf8');
console.log('Has POST method:', /method:\s*['"]POST['"]/i.test(c3));
console.log('Has PUT method:', /method:\s*['"]PUT['"]/i.test(c3));
console.log('Has comments POST Johan:', /JohanBendz.*issues\/comments/.test(c3));
const methods = c3.match(/method:\s*['"]([A-Z]+)['"]/g) || [];
console.log('Methods found:', methods);
console.log('Mode:', c3.match(/sourceMode['"]?\s*:\s*['"]([^'"]+)/)?.[1] || 'unknown');

console.log('\n=== auto-publish-on-push.yml ===');
const c4 = fs.readFileSync('.github/workflows/auto-publish-on-push.yml', 'utf8');
console.log('Has JohanBendz:', c4.includes('JohanBendz'));
console.log('Has dlnraja:', c4.includes('dlnraja'));
console.log('Has dlnraja/com.tuya.zigbee.stable:', c4.includes('dlnraja/com.tuya.zigbee.stable'));

console.log('\n=== publish.yml ===');
const c5 = fs.readFileSync('.github/workflows/publish.yml', 'utf8');
console.log('Has JohanBendz:', c5.includes('JohanBendz'));
console.log('Has dlnraja:', c5.includes('dlnraja'));

console.log('\n=== publish-stable.yml ===');
const c6 = fs.readFileSync('.github/workflows/publish-stable.yml', 'utf8');
console.log('Has JohanBendz:', c6.includes('JohanBendz'));
console.log('Has dlnraja:', c6.includes('dlnraja'));
console.log('Has tuya.zigbee.stable:', c6.includes('tuya.zigbee.stable'));
