const { extractMfrFromText, extractAllFP } = require('./.github/scripts/load-fingerprints.js');
console.log(extractMfrFromText('@dlnraja'));
console.log(extractMfrFromText('Manufacturer Name: ZG-204ZE'));
console.log(extractMfrFromText('_TZ3002_jn2x20tg'));
