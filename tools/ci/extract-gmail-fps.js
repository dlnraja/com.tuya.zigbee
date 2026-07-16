// Extract unique FPs from Gmail diagnostics + categorize
const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '..', '..', '.github', 'state', 'gmail', 'run29515970208', 'diagnostics', 'summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

// Dedupe FPs and group by prefix
const byPrefix = {};
const uniqueFPs = [...new Set(summary.unmatchedFPs.map(u => u.fp))];
for (const fp of uniqueFPs) {
  const m = fp.match(/^_T(YZ[A-Z0-9]+|ZE[A-Z0-9]+)_/);
  if (m) {
    const prefix = m[1];
    if (!byPrefix[prefix]) byPrefix[prefix] = [];
    byPrefix[prefix].push(fp);
  } else {
    if (!byPrefix._other) byPrefix._other = [];
    byPrefix._other.push(fp);
  }
}

console.log('=== Gmail Unmatched FPs (Unique) ===');
console.log('Total unique:', uniqueFPs.length);
console.log('\nBy prefix:');
for (const [prefix, fps] of Object.entries(byPrefix).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`  ${prefix}: ${fps.length}`);
}

const outPath = path.join(__dirname, '..', '..', '.github', 'state', 'gmail-unique-fps.json');
fs.writeFileSync(outPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  source: 'gmail-diagnostics-run29515970208',
  totalUnique: uniqueFPs.length,
  byPrefix,
  fps: uniqueFPs
}, null, 2));
console.log(`\nWrote ${outPath}`);

// Cross-ref with existing canonical
const canonicalPath = path.join(__dirname, '..', '..', 'node_modules', 'zigbee-herdsman-converters', 'devices', 'tuya.js');
let canonicalFPs = new Set();
if (fs.existsSync(canonicalPath)) {
  const content = fs.readFileSync(canonicalPath, 'utf8');
  const matches = content.match(/_T[A-Z0-9]+_[A-Za-z0-9]+/g) || [];
  matches.forEach(m => canonicalFPs.add(m));
}
console.log(`\nCanonical (zigbee-herdsman-converters) FPs: ${canonicalFPs.size}`);

const stillMissing = uniqueFPs.filter(fp => !canonicalFPs.has(fp));
console.log(`Gmail FPs NOT in canonical: ${stillMissing.length}`);
const out2 = path.join(__dirname, '..', '..', '.github', 'state', 'gmail-fps-not-in-canonical.json');
fs.writeFileSync(out2, JSON.stringify(stillMissing, null, 2));
console.log(`Wrote ${out2}`);
