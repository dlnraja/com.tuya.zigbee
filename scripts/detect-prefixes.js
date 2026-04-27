const fs = require('fs');
const path = require('path');

const fingerprints = JSON.parse(fs.readFileSync('data/fingerprints.json', 'utf8'));
const prefixes = new Set();

Object.keys(fingerprints).forEach(key => {
    const [mfr, pid] = key.split('|');
    if (mfr.startsWith('_TZ')) {
        const match = mfr.match(/^(_TZ[0-9A-Z]{4}_)/);
        if (match) prefixes.add(match[1]);
    } else {
        // For others, take first 8 chars if it looks like a prefix
        if (mfr.length > 8 && mfr.includes('_')) {
             const parts = mfr.split('_');
             if (parts[1] && parts[1].length === 4) {
                 prefixes.add(`_${parts[1]}_`);
             }
        }
    }
});

console.log('Detected Prefixes:', Array.from(prefixes).sort());
