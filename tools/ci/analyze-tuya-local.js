// analyze-tuya-local.js — check how many parallel fetchAll calls
const fs = require('fs');
const content = fs.readFileSync('scripts/scanners/tuya-local-scanner.js', 'utf8');
const fetchAllCalls = (content.match(/fetchAll\(/g) || []).length;
console.log('fetchAll calls:', fetchAllCalls);
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('while (true)') || lines[i].includes('Fetching page') || lines[i].includes('parallel fetch')) {
    console.log((i+1) + ': ' + lines[i].substring(0, 100));
  }
}
