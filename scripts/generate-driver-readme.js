#!/usr/bin/env node
/**
 * Generate README.md for each driver
 */

const fs = require('fs');
const path = require('path');

function generateDriverReadme(driverPath) {
  const driverName = path.basename(driverPath);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  No driver.compose.json found in ${driverPath}`);
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    const readme = `# ${compose.name?.en || driverName}

## Description
${compose.name?.fr || compose.name?.en || 'Tuya Zigbee device driver'}

## Class
\`${compose.class}\`

## Capabilities
${compose.capabilities?.map(cap => `- \`${cap}\``).join('\n') || '- None specified'}

## Zigbee Configuration
- **Manufacturer**: ${compose.zigbee?.manufacturerName?.join(', ') || 'Not specified'}
- **Product ID**: ${compose.zigbee?.productId?.join(', ') || 'Not specified'}

## Endpoints
${Object.entries(compose.zigbee?.endpoints || {}).map(([ep, config]) => `
### Endpoint ${ep}
- **Input Clusters**: ${config.clusters?.input?.join(', ') || 'None'}
- **Output Clusters**: ${config.clusters?.output?.join(', ') || 'None'}
`).join('')}

## Installation
This driver is automatically installed with the Tuya Zigbee app.

## Support
For support, please check the [Homey Community](https://community.homey.app) or create an issue on GitHub.

---
*Generated automatically on ${new Date().toISOString()}*
`;
    
    const readmePath = path.join(driverPath, 'README.md');
    fs.writeFileSync(readmePath, readme);
    console.log(`✅ Generated README for ${driverName}`);
    
  } catch (error) {
    console.error(`❌ Failed to generate README for ${driverName}:`, error.message);
  }
}

// Generate READMEs for all drivers
const driversDir = 'drivers';
if (fs.existsSync(driversDir)) {
  const drivers = fs.readdirSync(driversDir).filter(d => 
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  console.log(`📝 Generating READMEs for ${drivers.length} drivers...`);
  
  for (const driver of drivers) {
    generateDriverReadme(path.join(driversDir, driver));
  }
  
  console.log('🎉 README generation complete!');
} else {
  console.log('❌ Drivers directory not found');
}
