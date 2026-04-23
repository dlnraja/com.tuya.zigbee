/**
 * Device Matrix Generator - Creates documentation from drivers
 * Run: node scripts/automation/generate-matrix.js
 */
const { loadAllDrivers } = require('../lib/drivers');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../../docs/DEVICE_MATRIX.md');
const drivers = loadAllDrivers();

let matrix = '# Device Support Matrix\n\n';
matrix += '| Driver | Manufacturers | Products | Capabilities |\n';
matrix += '|--------|---------------|----------|-------------|\n';

let totalMfrs = 0;
for (const [name, d] of [...drivers].sort((a, b) => a[0].localeCompare(b[0]))) {
  totalMfrs += d.mfrs.length;
  matrix += `| ${name} | ${d.mfrs.length} | ${d.pids.join(', ') || '-'} | ${d.caps.slice(0, 3).join(', ')}${d.caps.length > 3 ? '...' : ''} |\n`      ;
}

matrix += `\n---\n**Total:** ${drivers.size} drivers, ${totalMfrs} manufacturer IDs\n`;
matrix += `\n*Generated: ${new Date().toISOString()}*\n`;

fs.writeFileSync(outputPath, matrix);
console.log(`Done: ${drivers.size} drivers, ${totalMfrs} manufacturer IDs`);
