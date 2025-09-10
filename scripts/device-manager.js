#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const RESOURCES_DIR = path.join(PROJECT_ROOT, 'resources');
const TEMPLATES_DIR = path.join(DRIVERS_DIR, '_templates');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user for input
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Load JSON file with error handling
function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return null;
  }
}

// Save JSON file with formatting
function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filePath}:`, error.message);
    return false;
  }
}

// Get list of existing drivers
function getExistingDrivers() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(DRIVERS_DIR)
    .filter(file => {
      const filePath = path.join(DRIVERS_DIR, file);
      return fs.statSync(filePath).isDirectory() && 
             !file.startsWith('_') && 
             fs.existsSync(path.join(filePath, 'driver.compose.json'));
    });
}

// Create a new driver from template
async function createNewDriver() {
  console.log('\n🆕 Creating a new driver...');
  
  // Get device information
  const model = await question('Enter device model (e.g., TS0121): ');
  const name = await question('Enter device name (e.g., Smart Plug): ');
  const manufacturer = await question('Enter manufacturer (default: Tuya): ') || 'Tuya';
  const description = await question('Enter device description: ');
  
  // Get capabilities
  console.log('\n💡 Enter device capabilities (comma-separated, e.g., onoff,measure_power,measure_voltage):');
  const capabilities = (await question('> '))
    .split(',')
    .map(cap => cap.trim())
    .filter(Boolean);
  
  // Get Zigbee clusters
  console.log('\n📡 Enter required Zigbee clusters (comma-separated, e.g., genOnOff,genBasic,genPowerCfg):');
  const clusters = (await question('> '))
    .split(',')
    .map(cluster => cluster.trim())
    .filter(Boolean);
  
  // Create driver directory
  const driverDir = path.join(DRIVERS_DIR, model.toLowerCase());
  if (fs.existsSync(driverDir)) {
    console.error(`❌ Driver directory already exists: ${driverDir}`);
    return false;
  }
  
  // Create directories
  fs.mkdirSync(driverDir, { recursive: true });
  fs.mkdirSync(path.join(driverDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(driverDir, 'assets/images'), { recursive: true });
  
  // Create driver.compose.json
  const composeJson = {
    id: uuidv4(),
    class: 'socket',
    name: {
      en: name,
      nl: name
    },
    description: {
      en: description,
      nl: description
    },
    category: ['socket'],
    capabilities: capabilities,
    capabilitiesOptions: {},
    zigbee: {
      manufacturer: manufacturer,
      model: model,
      vendor: 'Tuya',
      description: description,
      supports: capabilities,
      fromZigbee: clusters,
      toZigbee: clusters
    },
    images: {
      small: 'assets/images/icon.png',
      large: 'assets/images/icon.png',
      xlarge: 'assets/images/icon.png'
    }
  };
  
  // Create device.js
  const deviceJs = `const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${model.replace(/[^a-zA-Z0-9]/g, '')}Device extends ZigBeeDevice {
  
  async onNodeInit() {
    this.log('${name} has been initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    // Add more capability registrations as needed
    // Example:
    // this.registerCapability('measure_power', 'haElectricalMeasurement', {
    //   get: 'activePower',
    //   report: 'activePower',
    //   reportParser: value => value / 10
    // });
  }
  
  // Add custom methods here
  
}

module.exports = ${model.replace(/[^a-zA-Z0-9]/g, '')}Device;
`;
  
  // Save files
  saveJsonFile(path.join(driverDir, 'driver.compose.json'), composeJson);
  fs.writeFileSync(path.join(driverDir, 'device.js'), deviceJs);
  
  // Create a simple icon (placeholder)
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#2D3748"/>
  <text x="16" y="20" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${model}</text>
</svg>`;
  
  fs.writeFileSync(path.join(driverDir, 'assets/icon.svg'), iconSvg);
  
  console.log(`\n✅ Driver for ${model} created successfully!`);
  console.log(`📁 Location: ${path.relative(process.cwd(), driverDir)}`);
  
  return true;
}

// List all available drivers
function listDrivers() {
  const drivers = getExistingDrivers();
  
  if (drivers.length === 0) {
    console.log('\nℹ️  No drivers found.');
    return;
  }
  
  console.log('\n📋 Available Drivers:');
  console.log('='.repeat(50));
  
  drivers.forEach((driver, index) => {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const composePath = path.join(driverPath, 'driver.compose.json');
    const compose = loadJsonFile(composePath);
    
    console.log(`\n${index + 1}. ${driver}`);
    if (compose) {
      console.log(`   Name: ${compose.name?.en || 'N/A'}`);
      console.log(`   Model: ${compose.zigbee?.model || 'N/A'}`);
      console.log(`   Capabilities: ${compose.capabilities?.join(', ') || 'None'}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
}

// Update device database
async function updateDeviceDatabase() {
  console.log('\n🔄 Updating device database...');
  
  try {
    // This would typically fetch from external sources
    // For now, we'll just update the local database
    
    const devices = getExistingDrivers().map(driver => {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      const compose = loadJsonFile(composePath);
      
      return {
        model: driver,
        name: compose?.name?.en || driver,
        manufacturer: compose?.zigbee?.manufacturer || 'Tuya',
        description: compose?.description?.en || '',
        capabilities: compose?.capabilities || [],
        clusters: [
          ...(compose?.zigbee?.fromZigbee || []),
          ...(compose?.zigbee?.toZigbee || [])
        ],
        source: 'local',
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Save to device database
    const dbPath = path.join(RESOURCES_DIR, 'device-database.json');
    saveJsonFile(dbPath, devices);
    
    console.log(`✅ Device database updated with ${devices.length} devices`);
    console.log(`📁 Location: ${path.relative(process.cwd(), dbPath)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating device database:', error.message);
    return false;
  }
}

// Main menu
async function showMenu() {
  console.log('\n🏠 Homey Tuya Zigbee Device Manager');
  console.log('='.repeat(50));
  console.log('1. List all drivers');
  console.log('2. Create a new driver');
  console.log('3. Update device database');
  console.log('4. Exit');
  
  const choice = await question('\nSelect an option (1-4): ');
  
  switch (choice) {
    case '1':
      listDrivers();
      break;
      
    case '2':
      await createNewDriver();
      break;
      
    case '3':
      await updateDeviceDatabase();
      break;
      
    case '4':
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
      
    default:
      console.log('\n❌ Invalid option. Please try again.');
  }
  
  // Show menu again
  await showMenu();
}

// Start the application
console.clear();
console.log('🚀 Homey Tuya Zigbee Device Manager');
console.log('='.repeat(50));

// Ensure required directories exist
[DRIVERS_DIR, RESOURCES_DIR, TEMPLATES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Start the menu
showMenu().catch(error => {
  console.error('❌ An error occurred:', error);
  rl.close();
  process.exit(1);
});
