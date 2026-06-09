const fs = require('fs');
const r = JSON.parse(fs.readFileSync('./data/community-sync/report.json', 'utf8'));
process.stdout.write('=== Top-level keys: ' + Object.keys(r).join(', ') + '\n');
process.stdout.write('newCount: ' + r.newCount + ', enrichedCount: ' + r.enrichedCount + '\n');
process.stdout.write('newFps count: ' + (r.newFps?.length || 0) + ', enrichedFps count: ' + (r.enrichedFps?.length || 0) + '\n');

if (r.enrichedFps?.length > 0) {
  process.stdout.write('\n=== First 3 enrichedFps ===\n');
  r.enrichedFps.slice(0, 3).forEach(f => process.stdout.write(JSON.stringify(f, null, 2) + '\n'));
}
if (r.newFps?.length > 0) {
  process.stdout.write('\n=== First 3 newFps ===\n');
  r.newFps.slice(0, 3).forEach(f => process.stdout.write(JSON.stringify(f, null, 2) + '\n'));
}