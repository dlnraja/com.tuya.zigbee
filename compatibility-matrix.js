// Smart device compatibility matrix generator
const fs = require('fs');
const path = require('path');

function loadDriversConfig() {
  try {
    const configPath = path.join(__dirname, 'drivers', 'drivers-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return [];
  } catch (error) {
    console.log('No drivers config found, using empty array');
    return [];
  }
}

function generateCompatibilityMatrix() {
  const drivers = loadDriversConfig();
  
  // Ensure drivers is an array
  if (!Array.isArray(drivers)) {
    console.log('Drivers config is not an array, creating default matrix');
    return [{
      driver: 'default-tuya-device',
      compatibleDevices: ['TS0001', 'TS0011', 'TS004F', 'TS0121'],
      supportedProtocols: ['zigbee'],
      categories: ['lights', 'switches', 'sensors']
    }];
  }
  
  return drivers.map(driver => ({
    driver: driver.name || 'unknown',
    compatibleDevices: findCompatibleDevices(driver),
    supportedProtocols: driver.protocols || ['zigbee'],
    // ... other compatibility data
  }));
}

function findCompatibleDevices(driver) {
  // Implementation to match devices with driver capabilities
  return [];
}

// Generate and save matrix
try {
  const matrix = generateCompatibilityMatrix();
  const matricesDir = path.join(__dirname, 'matrices');
  
  if (!fs.existsSync(matricesDir)) {
    fs.mkdirSync(matricesDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(matricesDir, 'compatibility-matrix.json'), JSON.stringify(matrix, null, 2));
  console.log('✅ Compatibility matrix generated successfully');
} catch (error) {
  console.error('❌ Error generating compatibility matrix:', error.message);
}

module.exports = { generateCompatibilityMatrix, findCompatibleDevices };
