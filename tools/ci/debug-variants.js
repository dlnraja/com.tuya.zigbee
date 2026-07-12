// Check Z2M cache for case variants of our 96 mfrs
const fs = require('fs');
const plan = JSON.parse(fs.readFileSync('C:/Users/Dell/Documents/homey/master/.github/state/new-mfrs-from-johan.json', 'utf8')).integrationPlan;
const z2m = fs.readFileSync('C:/Users/Dell/Documents/homey/master/.github/state/z2m-tuya-raw.txt', 'utf8');

let withVariants = 0;
const samples = [];
for (const item of plan.slice(0, 96)) {
  const mfr = item.mfr;
  if (mfr.length < 8) continue; // Skip prefix-only
  // Generate 8 case variants
  const variants = [
    mfr,
    mfr.toUpperCase(),
    mfr.toLowerCase(),
    mfr.replace(/_TZE/, '_tze'),
    mfr.replace(/_TZ/, '_tz'),
    mfr.toUpperCase().replace(/_TZE/, '_TZE'),
    mfr.toLowerCase().replace(/_tze/, '_TZE'),
    mfr.replace(/_TZ3/, '_tz3'),
  ];
  const found = variants.filter((v) => v !== mfr && z2m.includes(v));
  if (found.length >= 1) {
    withVariants++;
    if (samples.length < 10) samples.push({ mfr, found: found.slice(0, 5) });
  }
}
console.log('Mfrs with case variants in z2m:', withVariants);
console.log('Samples:');
for (const s of samples) console.log('  ', s.mfr, '=>', s.found.join(', '));

// Also check what mfrs the Z2M cache contains that look like ours
console.log('');
console.log('Z2M cache prefixes:');
const ourPrefixes = ['_TZE200_', '_TZE204_', '_TZE284_', '_TZ3000_', '_TZ3210_', '_TYZB01_', '_TYST11_'];
for (const p of ourPrefixes) {
  const escP = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escP + '[a-zA-Z0-9_]+', 'g');
  const matches = z2m.match(re) || [];
  console.log('  ' + p + '* : ' + matches.length + ' matches, ' + new Set(matches).size + ' unique');
}
