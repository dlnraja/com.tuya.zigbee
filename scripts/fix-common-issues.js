/**
 * Fix Common Issues Script
 * 
 * This script automatically fixes common issues in the Tuya Zigbee project,
 * including standardizing driver structure, fixing imports, and ensuring
 * Zigbee configuration is correct.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

// Configuration
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const TEMPLATES_DIR = path.join(DRIVERS_DIR, '_templates');
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

// Track fixes
const fixes = {
  createdDirectories: [],
  copiedTemplates: [],
  fixedImports: [],
  updatedDriverCompose: [],
  updatedDeviceJS: [],
  updatedAppJson: false
};

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Recursively create directories
 */
async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
    if (!fixes.createdDirectories.includes(dir)) {
      fixes.createdDirectories.push(dir);
    }
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Copy template files to a driver directory
 */
async function copyTemplates(driverDir) {
  const templateFiles = [
    { src: 'device.js', dest: 'device.js' },
    { src: 'driver.js', dest: 'driver.js' },
    { src: 'driver.compose.json', dest: 'driver.compose.json' }
  ];
  
  for (const { src, dest } of templateFiles) {
    const srcPath = path.join(TEMPLATES_DIR, src);
    const destPath = path.join(driverDir, dest);
    
    if (await fileExists(destPath)) continue;
    
    await ensureDir(path.dirname(destPath));
    await copyFile(srcPath, destPath);
    fixes.copiedTemplates.push(destPath);
  }
}

/**
 * Fix imports in a JavaScript file
 */
async function fixImports(filePath) {
  try {
    let content = await readFile(filePath, 'utf8');
    let modified = false;
    
    // Fix common import issues
    const importFixes = [
      // Fix homey imports
      { 
        pattern: /require\(['"]homey\-?zigbeedriver?['"]\)/g,
        replacement: 'require("homey-zigbeedriver")'
      },
      // Fix zigbee-clusters imports
      { 
        pattern: /require\(['"]zigbee\-?clusters?['"]\)/g,
        replacement: 'require("zigbee-clusters")'
      },
      // Fix relative imports
      { 
        pattern: /require\(['"]\.\.\/common\/([^'"\/]+)['"]\)/g,
        replacement: 'require("../../common/$1")'
      },
      // Fix missing extensions
      { 
        pattern: /require\(['"]([^'"\/]+)['"]\)/g,
        replacement: (match, p1) => {
          if (!p1.startsWith('.') && !p1.startsWith('homey') && !p1.startsWith('zigbee')) {
            return `require('./${p1}')`;
          }
          return match;
        }
      }
    ];
    
    for (const { pattern, replacement } of importFixes) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      await writeFile(filePath, content, 'utf8');
      fixes.fixedImports.push(filePath);
    }
  } catch (err) {
    console.error(`Error fixing imports in ${filePath}:`, err);
  }
}

/**
 * Update driver.compose.json with required Zigbee configuration
 */
async function updateDriverCompose(driverDir) {
  const composePath = path.join(driverDir, 'driver.compose.json');
  
  try {
    const content = await readFile(composePath, 'utf8');
    const driverCompose = JSON.parse(content);
    let modified = false;
    
    // Ensure driver has an ID
    if (!driverCompose.id) {
      driverCompose.id = path.basename(driverDir);
      modified = true;
    }
    
    // Ensure driver has a class
    if (!driverCompose.class) {
      driverCompose.class = 'sensor'; // Default to sensor, can be overridden
      modified = true;
    }
    
    // Ensure Zigbee configuration exists
    if (!driverCompose.zigbee) {
      driverCompose.zigbee = {
        manufacturerName: ["Tuya"],
        productId: [driverCompose.id],
        endpoints: {
          "1": {
            "clusters": [0, 1],
            "bindings": [1]
          }
        }
      };
      modified = true;
    }
    
    // Ensure capabilities exist
    if (!driverCompose.capabilities || !Array.isArray(driverCompose.capabilities)) {
      driverCompose.capabilities = [];
      modified = true;
    }
    
    // Add battery capability if not present
    if (driverCompose.class === 'sensor' && !driverCompose.capabilities.includes('measure_battery')) {
      driverCompose.capabilities.push('measure_battery');
      modified = true;
    }
    
    if (modified) {
      await writeFile(composePath, JSON.stringify(driverCompose, null, 2), 'utf8');
      fixes.updatedDriverCompose.push(composePath);
    }
  } catch (err) {
    console.error(`Error updating driver.compose.json at ${composePath}:`, err);
  }
}

/**
 * Update device.js to extend BaseZigbeeDevice
 */
async function updateDeviceJS(driverDir) {
  const deviceJSPath = path.join(driverDir, 'device.js');
  
  try {
    let content = await readFile(deviceJSPath, 'utf8');
    let modified = false;
    
    // Check if the file already extends a Zigbee device class
    if (!content.includes('extends BaseZigbeeDevice') && 
        !content.includes('extends ZigBeeDevice') && 
        !content.includes('extends ZigbeeDevice')) {
      
      // Add BaseZigbeeDevice import if not present
      if (!content.includes('BaseZigbeeDevice')) {
        const importStatement = 'const BaseZigbeeDevice = require("../../common/BaseZigbeeDevice");\n';
        content = content.replace(/^'use strict';\n/, `'use strict';\n\n${importStatement}`);
      }
      
      // Update the class to extend BaseZigbeeDevice
      content = content.replace(
        /class\s+(\w+)\s+extends\s+\w+/,
        'class $1 extends BaseZigbeeDevice'
      );
      
      // If no extends clause exists, add it
      if (!/class\s+\w+\s+extends/.test(content)) {
        content = content.replace(
          /class\s+(\w+)(\s*\{)/,
          'class $1 extends BaseZigbeeDevice$2'
        );
      }
      
      modified = true;
    }
    
    // Ensure the constructor calls super()
    if (!content.includes('super({')) {
      content = content.replace(
        /constructor\(([^)]*)\)\s*\{\s*(\/\*.*?\*\/\s*)?(\/\/.*?\n\s*)?/,
        (match, args, comment1, comment2) => {
          return `constructor(${args}) {
    super({ homey: this.homey, node: this.node });
    ${comment1 || ''}${comment2 || ''}`.replace(/\n\s*\n/g, '\n');
        }
      );
      modified = true;
    }
    
    if (modified) {
      await writeFile(deviceJSPath, content, 'utf8');
      fixes.updatedDeviceJS.push(deviceJSPath);
    }
  } catch (err) {
    console.error(`Error updating device.js at ${deviceJSPath}:`, err);
  }
}

/**
 * Update app.json with driver entries
 */
async function updateAppJson() {
  try {
    const content = await readFile(APP_JSON_PATH, 'utf8');
    const appJson = JSON.parse(content);
    
    if (!appJson.drivers || !Array.isArray(appJson.drivers)) {
      appJson.drivers = [];
    }
    
    // Get all driver directories
    const driverDirs = await getDriverDirs();
    const driverIds = driverDirs.map(dir => path.basename(dir));
    
    // Add missing drivers to app.json
    for (const driverId of driverDirs) {
      const driverBaseName = path.basename(driverId);
      const driverInAppJson = appJson.drivers.some(d => d.id === driverBaseName);
      
      if (!driverInAppJson) {
        const driverComposePath = path.join(driverId, 'driver.compose.json');
        
        try {
          const driverComposeContent = await readFile(driverComposePath, 'utf8');
          const driverCompose = JSON.parse(driverComposeContent);
          
          // Create a minimal driver entry
          const driverEntry = {
            id: driverBaseName,
            name: driverCompose.name || { en: driverBaseName },
            class: driverCompose.class || 'sensor',
            capabilities: driverCompose.capabilities || [],
            zigbee: driverCompose.zigbee || {
              manufacturerName: ["Tuya"],
              productId: [driverBaseName],
              endpoints: {
                "1": {
                  "clusters": [0, 1],
                  "bindings": [1]
                }
              }
            }
          };
          
          appJson.drivers.push(driverEntry);
          fixes.updatedAppJson = true;
        } catch (err) {
          console.error(`Error processing driver ${driverBaseName}:`, err);
        }
      }
    }
    
    // Save updated app.json
    if (fixes.updatedAppJson) {
      await writeFile(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
    }
    
  } catch (err) {
    console.error('Error updating app.json:', err);
  }
}

/**
 * Get all driver directories
 */
async function getDriverDirs() {
  const driverDirs = [];
  
  async function scanDir(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Check if this is a driver directory (contains driver.compose.json)
        const hasDriverCompose = await fileExists(path.join(fullPath, 'driver.compose.json'));
        
        if (hasDriverCompose) {
          driverDirs.push(fullPath);
        } else {
          // Recursively scan subdirectories
          await scanDir(fullPath);
        }
      }
    }
  }
  
  await scanDir(DRIVERS_DIR);
  return driverDirs;
}

/**
 * Print report of fixes
 */
function printReport() {
  console.log('\n=== Fixes Applied ===\n');
  
  // Created directories
  if (fixes.createdDirectories.length > 0) {
    console.log('📁 Created directories:');
    fixes.createdDirectories.forEach(dir => {
      console.log(`  - ${path.relative(process.cwd(), dir)}`);
    });
    console.log();
  }
  
  // Copied templates
  if (fixes.copiedTemplates.length > 0) {
    console.log('📄 Copied template files:');
    fixes.copiedTemplates.forEach(file => {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    });
    console.log();
  }
  
  // Fixed imports
  if (fixes.fixedImports.length > 0) {
    console.log('🔧 Fixed imports in:');
    fixes.fixedImports.forEach(file => {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    });
    console.log();
  }
  
  // Updated driver.compose.json
  if (fixes.updatedDriverCompose.length > 0) {
    console.log('📝 Updated driver.compose.json files:');
    fixes.updatedDriverCompose.forEach(file => {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    });
    console.log();
  }
  
  // Updated device.js
  if (fixes.updatedDeviceJS.length > 0) {
    console.log('📝 Updated device.js files:');
    fixes.updatedDeviceJS.forEach(file => {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    });
    console.log();
  }
  
  // Updated app.json
  if (fixes.updatedAppJson) {
    console.log('📝 Updated app.json with missing drivers');
    console.log();
  }
  
  console.log('✅ Fixes completed!');
}

/**
 * Main function
 */
async function main() {
  console.log('Fixing common issues in the project...');
  
  // Ensure templates directory exists
  await ensureDir(TEMPLATES_DIR);
  
  // Get all driver directories
  const driverDirs = await getDriverDirs();
  
  if (driverDirs.length === 0) {
    console.error('No driver directories found!');
    return;
  }
  
  console.log(`Found ${driverDirs.length} driver directories to process.`);
  
  // Process each driver
  for (const dir of driverDirs) {
    // Copy missing template files
    await copyTemplates(dir);
    
    // Fix imports in JavaScript files
    const jsFiles = [
      path.join(dir, 'device.js'),
      path.join(dir, 'driver.js')
    ];
    
    for (const jsFile of jsFiles) {
      if (await fileExists(jsFile)) {
        await fixImports(jsFile);
      }
    }
    
    // Update driver.compose.json
    await updateDriverCompose(dir);
    
    // Update device.js
    const deviceJS = path.join(dir, 'device.js');
    if (await fileExists(deviceJS)) {
      await updateDeviceJS(dir);
    }
  }
  
  // Update app.json
  await updateAppJson();
  
  // Print report
  printReport();
}

// Run the script
main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});
