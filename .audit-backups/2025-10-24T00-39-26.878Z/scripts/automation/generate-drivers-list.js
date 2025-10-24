#!/usr/bin/env node

/**
 * Generate Beautiful Drivers List for README
 * 
 * Creates organized, categorized list of all drivers
 * Auto-updates via GitHub Actions
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CATEGORY DEFINITIONS (Based on project structure)
// =============================================================================

const CATEGORIES = {
  'sensor': {
    name: '🌡️ Temperature & Climate',
    emoji: '🌡️',
    order: 1,
    subcategories: ['temperature', 'humidity', 'climate', 'thermostat', 'air_quality']
  },
  'light': {
    name: '💡 Smart Lighting',
    emoji: '💡',
    order: 2,
    subcategories: ['light', 'bulb', 'led', 'dimmer']
  },
  'socket': {
    name: '🔌 Power & Energy',
    emoji: '🔌',
    order: 3,
    subcategories: ['socket', 'plug', 'outlet', 'power', 'energy']
  },
  'button': {
    name: '🎛️ Automation Control',
    emoji: '🎛️',
    order: 4,
    subcategories: ['button', 'switch', 'scene', 'remote', 'knob']
  },
  'doorbell': {
    name: '🔔 Contact & Security',
    emoji: '🔔',
    order: 5,
    subcategories: ['contact', 'door', 'window', 'lock', 'doorbell']
  },
  'homealarm': {
    name: '🚨 Safety & Detection',
    emoji: '🚨',
    order: 6,
    subcategories: ['smoke', 'water', 'leak', 'gas', 'co', 'alarm']
  },
  'curtain': {
    name: '🪟 Covers & Blinds',
    emoji: '🪟',
    order: 7,
    subcategories: ['curtain', 'blind', 'shade', 'cover']
  },
  'other': {
    name: '🔧 Other Devices',
    emoji: '🔧',
    order: 99,
    subcategories: ['other', 'valve', 'siren', 'fan']
  }
};

// =============================================================================
// DRIVER ANALYSIS
// =============================================================================

function analyzeDrivers() {
  console.log('📊 Analyzing drivers...');
  
  const driversPath = path.join(__dirname, '../../drivers');
  const drivers = [];
  
  try {
    const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const driverDir of driverDirs) {
      // Try driver.compose.json first (SDK3), then driver.json
      let driverJsonPath = path.join(driversPath, driverDir, 'driver.compose.json');
      if (!fs.existsSync(driverJsonPath)) {
        driverJsonPath = path.join(driversPath, driverDir, 'driver.json');
      }
      
      if (fs.existsSync(driverJsonPath)) {
        const driverJson = JSON.parse(fs.readFileSync(driverJsonPath, 'utf8'));
        
        // Extract info
        const manufacturerIds = [];
        if (driverJson.zigbee && driverJson.zigbee.manufacturerName) {
          const names = Array.isArray(driverJson.zigbee.manufacturerName) 
            ? driverJson.zigbee.manufacturerName 
            : [driverJson.zigbee.manufacturerName];
          manufacturerIds.push(...names);
        }
        
        const productIds = [];
        if (driverJson.zigbee && driverJson.zigbee.productId) {
          const ids = Array.isArray(driverJson.zigbee.productId)
            ? driverJson.zigbee.productId
            : [driverJson.zigbee.productId];
          productIds.push(...ids);
        }
        
        drivers.push({
          id: driverDir,
          name: driverJson.name?.en || driverDir,
          class: driverJson.class || 'other',
          capabilities: driverJson.capabilities || [],
          manufacturerCount: manufacturerIds.length,
          productCount: productIds.length,
          totalIds: manufacturerIds.length + productIds.length
        });
      }
    }
    
    console.log(`✅ Found ${drivers.length} drivers`);
    return drivers;
    
  } catch (error) {
    console.error('❌ Error analyzing drivers:', error.message);
    return [];
  }
}

// =============================================================================
// CATEGORIZE DRIVERS
// =============================================================================

function categorizeDrivers(drivers) {
  console.log('📂 Categorizing drivers...');
  
  const categorized = {};
  
  // Initialize categories
  Object.keys(CATEGORIES).forEach(cat => {
    categorized[cat] = [];
  });
  
  // Categorize each driver
  drivers.forEach(driver => {
    let categoryFound = false;
    
    // Try to match by class
    if (CATEGORIES[driver.class]) {
      categorized[driver.class].push(driver);
      categoryFound = true;
    } else {
      // Try to match by name/id keywords
      const lowerName = `${driver.id} ${driver.name}`.toLowerCase();
      
      for (const [catKey, catData] of Object.entries(CATEGORIES)) {
        if (catData.subcategories.some(sub => lowerName.includes(sub))) {
          categorized[catKey].push(driver);
          categoryFound = true;
          break;
        }
      }
    }
    
    // Default to 'other'
    if (!categoryFound) {
      categorized['other'].push(driver);
    }
  });
  
  // Sort drivers within each category
  Object.keys(categorized).forEach(cat => {
    categorized[cat].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return categorized;
}

// =============================================================================
// GENERATE MARKDOWN TABLE
// =============================================================================

function generateMarkdownTable(categorized) {
  console.log('📝 Generating markdown table...');
  
  let markdown = '';
  
  // Header
  markdown += '## 📱 Supported Devices\n\n';
  markdown += '> **Auto-generated list** - Updated automatically via GitHub Actions\n\n';
  
  // Statistics
  const totalDrivers = Object.values(categorized).reduce((sum, cat) => sum + cat.length, 0);
  const totalIds = Object.values(categorized)
    .flat()
    .reduce((sum, driver) => sum + driver.totalIds, 0);
  
  markdown += `**Total:** ${totalDrivers} drivers supporting ${totalIds}+ device IDs\n\n`;
  
  // Categories (sorted by order)
  const sortedCategories = Object.entries(CATEGORIES)
    .sort((a, b) => a[1].order - b[1].order);
  
  for (const [catKey, catData] of sortedCategories) {
    const drivers = categorized[catKey];
    
    if (drivers.length === 0) continue;
    
    markdown += `### ${catData.name}\n\n`;
    markdown += `**${drivers.length} drivers** in this category\n\n`;
    
    // Table header
    markdown += '| Device | Capabilities | IDs |\n';
    markdown += '|--------|--------------|-----|\n';
    
    // Table rows
    for (const driver of drivers) {
      const capsText = driver.capabilities.length > 0 
        ? driver.capabilities.slice(0, 3).join(', ') + (driver.capabilities.length > 3 ? '...' : '')
        : '-';
      
      markdown += `| ${driver.name} | ${capsText} | ${driver.totalIds} |\n`;
    }
    
    markdown += '\n';
  }
  
  // Footer
  markdown += '---\n\n';
  markdown += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n\n`;
  
  return markdown;
}

// =============================================================================
// GENERATE COMPACT LIST (Alternative format)
// =============================================================================

function generateCompactList(categorized) {
  console.log('📝 Generating compact list...');
  
  let markdown = '';
  
  // Header
  markdown += '## 📱 Supported Devices\n\n';
  markdown += '> **Auto-generated list** - Updated automatically\n\n';
  
  // Statistics
  const totalDrivers = Object.values(categorized).reduce((sum, cat) => sum + cat.length, 0);
  const totalIds = Object.values(categorized)
    .flat()
    .reduce((sum, driver) => sum + driver.totalIds, 0);
  
  markdown += `**Total:** ${totalDrivers} drivers | ${totalIds}+ device IDs\n\n`;
  
  // Categories
  const sortedCategories = Object.entries(CATEGORIES)
    .sort((a, b) => a[1].order - b[1].order);
  
  for (const [catKey, catData] of sortedCategories) {
    const drivers = categorized[catKey];
    
    if (drivers.length === 0) continue;
    
    markdown += `### ${catData.emoji} ${catData.name.replace(catData.emoji + ' ', '')}\n\n`;
    
    // Compact list
    markdown += '<details>\n';
    markdown += `<summary><strong>${drivers.length} drivers</strong> - Click to expand</summary>\n\n`;
    
    for (const driver of drivers) {
      markdown += `- **${driver.name}** - ${driver.totalIds} device IDs\n`;
    }
    
    markdown += '\n</details>\n\n';
  }
  
  // Footer
  markdown += '---\n\n';
  markdown += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n\n`;
  
  return markdown;
}

// =============================================================================
// UPDATE README
// =============================================================================

function updateReadme(driversMarkdown) {
  console.log('📄 Updating README.md...');
  
  const readmePath = path.join(__dirname, '../../README.md');
  
  if (!fs.existsSync(readmePath)) {
    console.error('❌ README.md not found');
    return false;
  }
  
  let readme = fs.readFileSync(readmePath, 'utf8');
  
  // Markers for auto-update section
  const startMarker = '<!-- AUTO-GENERATED-DRIVERS-START -->';
  const endMarker = '<!-- AUTO-GENERATED-DRIVERS-END -->';
  
  // Check if markers exist
  if (!readme.includes(startMarker) || !readme.includes(endMarker)) {
    console.log('⚠️  Markers not found, adding at end of README');
    readme += `\n\n${startMarker}\n${driversMarkdown}${endMarker}\n`;
  } else {
    // Replace content between markers
    const startIndex = readme.indexOf(startMarker) + startMarker.length;
    const endIndex = readme.indexOf(endMarker);
    
    readme = readme.substring(0, startIndex) + '\n' + driversMarkdown + readme.substring(endIndex);
  }
  
  fs.writeFileSync(readmePath, readme);
  console.log('✅ README.md updated');
  
  return true;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('🚀 Generating Drivers List for README');
  console.log('=====================================\n');
  
  // 1. Analyze drivers
  const drivers = analyzeDrivers();
  
  if (drivers.length === 0) {
    console.log('⚠️  No drivers found');
    return;
  }
  
  // 2. Categorize
  const categorized = categorizeDrivers(drivers);
  
  // 3. Generate markdown (use compact list for better visual)
  const markdown = generateCompactList(categorized);
  
  // 4. Update README
  const success = updateReadme(markdown);
  
  if (success) {
    console.log('\n✅ Drivers list generated successfully!');
    console.log('📄 README.md has been updated');
    console.log('\n💡 Commit and push to trigger auto-update via GitHub Actions');
  } else {
    console.log('\n❌ Failed to update README.md');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeDrivers, categorizeDrivers, generateMarkdownTable, generateCompactList };
