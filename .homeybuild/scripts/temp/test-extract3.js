const { extractMfrFromText, extractAllFP, buildFullIndex } = require('./.github/scripts/load-fingerprints.js');
const text = 'Hi @dlnraja , ZG-204ZE CK-BL702-MWS-01(7016)';
const {allMfrs, allPids} = buildFullIndex();
const res = extractAllFP(text, allMfrs, allPids);
console.log('MFR:', res.mfr);
console.log('PID:', res.pid);
