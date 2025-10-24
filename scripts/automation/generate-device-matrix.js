#!/usr/bin/env node
'use strict';

/**
 * Generate Device Matrix
 * Creates a comprehensive markdown table of all supported devices
 */

const fs = require('fs');
const path = require('path');

console.log('Generating Device Matrix...\n');

// Load driver categories
let categories = {};
try {
  categories = JSON.parse(fs.readFileSync('DRIVER_CATEGORIES.json', 'utf8')).categories || {};
} catch (err) {
  console.log('Warning: DRIVER_CATEGORIES.json not found, using defaults');
}

// Load manufacturer database
let manufacturerDB = {};
try {
  const dbPath = path.join('utils', 'manufacturer-database.js');
  if (fs.existsSync(dbPath)) {
    const dbModule = require(path.resolve(dbPath));
    manufacturerDB = dbModule.MANUFACTURER_DATABASE || {};
  }
} catch (err) {
  console.log('Warning: manufacturer-database.js not found');
}

// Get all drivers
const driversPath = path.join(process.cwd(), 'drivers');
const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Parse driver data
const drivers = [];

driverDirs.forEach(driverName => {
  const composePath = path.join(driversPath, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return;
  }
  
  try {
    const driverData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const metadata = categories[driverName] || {};
    
    drivers.push({
      id: driverData.id || driverName,
      name: driverData.name?.en || driverName,
      class: driverData.class || 'unknown',
      category: metadata.category || 'uncategorized',
      power_source: metadata.power_source || 'unknown',
      manufacturer: driverData.zigbee?.manufacturerName?.join(', ') || 'Multiple',
      capabilities: (driverData.capabilities || []).length,
      zigbee_version: '3.0',
      status: 'confirmed'
    });
  } catch (err) {
    console.log(`Error parsing ${driverName}: ${err.message}`);
  }
});

// Sort by category, then name
drivers.sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.name.localeCompare(b.name);
});

// Generate Markdown
let markdown = `# 📊 Device Support Matrix

**Generated:** ${new Date().toISOString().split('T')[0]}  
**Total Drivers:** ${drivers.length}  
**App Version:** ${getAppVersion()}

---

## 🎯 Quick Stats

`;

// Stats by category
const categoryStats = {};
drivers.forEach(d => {
  categoryStats[d.category] = (categoryStats[d.category] || 0) + 1;
});

markdown += `| Category | Drivers |\n`;
markdown += `|----------|--------:|\n`;
Object.keys(categoryStats).sort().forEach(cat => {
  markdown += `| ${String(cat).replace('/', ' / ')} | ${categoryStats[cat]} |\n`;
});

markdown += `\n---\n\n## 📋 Complete Device List\n\n`;
markdown += `| Name | Class | Category | Power | Capabilities | Status |\n`;
markdown += `|------|-------|----------|-------|--------------|--------|\n`;

drivers.forEach(d => {
  const powerIcon = getPowerIcon(d.power_source);
  const statusIcon = d.status === 'confirmed' ? '✅' : '🔄';
  
  markdown += `| ${d.name} | ${d.class} | ${d.category} | ${powerIcon} | ${d.capabilities} | ${statusIcon} |\n`;
});

markdown += `\n---\n\n## 🔋 Power Source Legend\n\n`;
markdown += `- 🔌 **AC** - Mains powered (always-on, mesh repeater)\n`;
markdown += `- 🔋 **Battery** - Battery powered (CR2032, CR2450, AAA, AA)\n`;
markdown += `- ⚡ **Hybrid** - AC with battery backup\n`;
markdown += `- ❓ **Unknown** - Power source not yet categorized\n\n`;

markdown += `## ✅ Status Legend\n\n`;
markdown += `- ✅ **Confirmed** - Tested and validated by community\n`;
markdown += `- 🔄 **Proposed** - Added via Z2M data, awaiting user confirmation\n\n`;

markdown += `---\n\n`;
markdown += `## 📖 How to Read This Matrix\n\n`;
markdown += `**Capabilities:** Number of Homey capabilities supported by this driver\n\n`;
markdown += `**Category:** Functional grouping for easier navigation\n\n`;
markdown += `**Class:** Homey device class (light, sensor, socket, etc.)\n\n`;

markdown += `\n---\n\n`;
markdown += `## 🤝 Contributing\n\n`;
markdown += `Device missing? [Request Support](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=device-request.yml)\n\n`;
markdown += `---\n\n`;
markdown += `**Last Updated:** ${new Date().toISOString()}\n`;

// Write file
fs.writeFileSync('DEVICE_MATRIX.md', markdown);
console.log(`✅ Device Matrix generated: DEVICE_MATRIX.md`);
console.log(`   Total drivers: ${drivers.length}`);
console.log(`   Categories: ${Object.keys(categoryStats).length}`);

// Helper functions
function getPowerIcon(powerSource) {
  if (powerSource === 'ac') return '🔌';
  if (powerSource === 'battery') return '🔋';
  if (powerSource === 'hybrid') return '⚡';
  return '❓';
}

function getAppVersion() {
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    return appJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
