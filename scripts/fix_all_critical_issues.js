const fs = require('fs');
const path = require('path');

console.log('🔧 COMPREHENSIVE CRITICAL FIX SCRIPT');
console.log('=====================================\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const stats = {
  totalDrivers: 0,
  fixedReadAttributes: 0,
  fixedIEEE: 0,
  fixedSyntax: 0,
  errors: []
};

/**
 * Fix deprecated readAttributes() calls
 * Old: readAttributes('attributeName')
 * New: readAttributes(['attributeName'])
 */
function fixReadAttributesCalls(content, driverPath) {
  let modified = false;
  
  // Pattern 1: readAttributes('string')
  const pattern1 = /\.readAttributes\('([^']+)'\)/g;
  if (pattern1.test(content)) {
    content = String(content).replace(pattern1, ".readAttributes(['$1'])");
    modified = true;
  }
  
  // Pattern 2: readAttributes("string")
  const pattern2 = /\.readAttributes\("([^"]+)"\)/g;
  if (pattern2.test(content)) {
    content = String(content).replace(pattern2, ".readAttributes(['$1'])");
    modified = true;
  }
  
  // Pattern 3: readAttributes(variable) where variable is a string
  const pattern3 = /\.readAttributes\((\w+)\)(?!\[)/g;
  const matches = content.match(pattern3);
  if (matches) {
    // Check if the variable is likely a string (not already an array)
    for (const match of matches) {
      const varName = match.match(/\.readAttributes\((\w+)\)/)[1];
      // If the variable doesn't look like it's an array, wrap it
      if (!content.includes(`${varName} = [`)) {
        content = String(content).replace(
          new RegExp(`\\.readAttributes\\(${varName}\\)`, 'g'),
          `.readAttributes([${varName}])`
        );
        modified = true;
      }
    }
  }
  
  return { content, modified };
}

/**
 * Fix IEEE address issues in IAS Zone enrollment
 */
function fixIEEEAddressIssues(content, driverPath) {
  let modified = false;
  
  // Add error handling for IEEE address discovery
  if (content.includes('this.zclNode.ieeeAddress') && 
      !content.includes('try') &&
      content.includes('IASZone')) {
    
    const ieeePattern = /const ieeeAddress = this\.zclNode\.ieeeAddress;/g;
    if (ieeePattern.test(content)) {
      content = String(content).replace(
        ieeePattern,
        `let ieeeAddress;
    try {
      ieeeAddress = this.zclNode.ieeeAddress || 
                    this.getData().ieeeAddress ||
                    (this.homey.zigbee && await this.homey.zigbee.getNode(this).catch(() => null))?.ieeeAddress;
      
      if (!ieeeAddress) {
        this.log('⚠️  IEEE address not available, using fallback enrollment');
      }
    } catch (err) {
      this.log('⚠️  Error getting IEEE address:', err.message);
    }`
      );
      modified = true;
    }
  }
  
  return { content, modified };
}

/**
 * Fix common syntax errors
 */
function fixSyntaxErrors(content, driverPath) {
  let modified = false;
  let lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Fix: async pollAttributes() { without preceding }
    if (line.trim().startsWith('async pollAttributes()') && 
        i > 0 && 
        !lines[i-1].trim().endsWith('}') &&
        !lines[i-1].trim().endsWith('{')) {
      lines.splice(i, 0, '  }');
      modified = true;
      stats.fixedSyntax++;
    }
    
    // Fix: missing closing braces before method declarations
    if (line.match(/^\s+async \w+\(/) && 
        i > 0 && 
        !lines[i-1].trim().endsWith('}') &&
        !lines[i-1].trim().endsWith('{') &&
        lines[i-1].trim().length > 0) {
      const indent = line.match(/^\s*/)[0];
      lines.splice(i, 0, indent + '}');
      modified = true;
      stats.fixedSyntax++;
    }
  }
  
  if (modified) {
    content = lines.join('\n');
  }
  
  return { content, modified };
}

/**
 * Process a single device.js file
 */
function processDeviceFile(devicePath, driverName) {
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    let totalModified = false;
    
    // Fix 1: readAttributes API
    let result1 = fixReadAttributesCalls(content, devicePath);
    if (result1.modified) {
      content = result1.content;
      totalModified = true;
      stats.fixedReadAttributes++;
    }
    
    // Fix 2: IEEE address issues
    let result2 = fixIEEEAddressIssues(content, devicePath);
    if (result2.modified) {
      content = result2.content;
      totalModified = true;
      stats.fixedIEEE++;
    }
    
    // Fix 3: Syntax errors
    let result3 = fixSyntaxErrors(content, devicePath);
    if (result3.modified) {
      content = result3.content;
      totalModified = true;
    }
    
    if (totalModified) {
      fs.writeFileSync(devicePath, content, 'utf8');
      console.log(`✅ ${driverName}`);
    }
    
    return totalModified;
    
  } catch (err) {
    stats.errors.push({ driver: driverName, error: err.message });
    console.error(`❌ ${driverName}: ${err.message}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  const drivers = fs.readdirSync(driversDir).filter(name => {
    const driverPath = path.join(driversDir, name);
    return fs.statSync(driverPath).isDirectory();
  });
  
  stats.totalDrivers = drivers.length;
  console.log(`📋 Found ${drivers.length} drivers\n`);
  
  let fixed = 0;
  
  for (const driverName of drivers) {
    const devicePath = path.join(driversDir, driverName, 'device.js');
    
    if (!fs.existsSync(devicePath)) {
      continue;
    }
    
    if (processDeviceFile(devicePath, driverName)) {
      fixed++;
    }
  }
  
  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Total drivers processed: ${stats.totalDrivers}`);
  console.log(`Drivers fixed: ${fixed}`);
  console.log(`  - readAttributes() fixed: ${stats.fixedReadAttributes}`);
  console.log(`  - IEEE address fixed: ${stats.fixedIEEE}`);
  console.log(`  - Syntax errors fixed: ${stats.fixedSyntax}`);
  console.log(`Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(e => console.log(`  - ${e.driver}: ${e.error}`));
  }
  
  console.log('\n✅ Critical fixes completed!');
}

main();
