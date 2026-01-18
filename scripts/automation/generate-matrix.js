/**
 * Device Matrix Generator - Creates documentation from drivers
 * Run: node scripts/automation/generate-matrix.js
 */
const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');
const outputPath = path.join(__dirname, '../../docs/DEVICE_MATRIX.md');

let matrix = '# Device Support Matrix\n\n';
matrix += '| Driver | Manufacturers | Products | Capabilities |\n';
matrix += '|--------|---------------|----------|-------------|\n';

let totalMfrs = 0, totalDrivers = 0;

fs.readdirSync(driversDir).sort().forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = data.zigbee?.manufacturerName || [];
    const pids = data.zigbee?.productId || [];
    const caps = data.capabilities || [];
    
    totalMfrs += mfrs.length;
    totalDrivers++;
    
    matrix += `| ${driver} | ${mfrs.length} | ${pids.join(', ') || '-'} | ${caps.slice(0, 3).join(', ')}${caps.length > 3 ? '...' : ''} |\n`;
  } catch (e) {}
});

matrix += `\n---\n**Total:** ${totalDrivers} drivers, ${totalMfrs} manufacturer IDs\n`;
matrix += `\n*Generated: ${new Date().toISOString()}*\n`;

fs.writeFileSync(outputPath, matrix);
console.log(`✅ Matrix generated: ${outputPath}`);
console.log(`📊 ${totalDrivers} drivers, ${totalMfrs} manufacturer IDs`);
