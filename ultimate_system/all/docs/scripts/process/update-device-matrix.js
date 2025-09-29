const fs = require('fs');
const path = require('path');
const { table } = require('table');

// Configuration
const DEVICES_FILE = path.join(__dirname, '../../resources/device-data/processed-devices.json');
const MATRIX_FILE = path.join(__dirname, '../../docs/sources/DEVICE_MATRIX.md');
const SUPPORTED_DEVICES_FILE = path.join(__dirname, '../../drivers/supported-devices.json');

// Ensure directories exist
[path.dirname(DEVICES_FILE), path.dirname(MATRIX_FILE)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Loads the list of supported devices from the project
 */
function loadSupportedDevices() {
  try {
    if (fs.existsSync(SUPPORTED_DEVICES_FILE)) {
      return JSON.parse(fs.readFileSync(SUPPORTED_DEVICES_FILE, 'utf8'));
    }
    return [];
  } catch (error) {
    console.error('Error loading supported devices:', error);
    return [];
  }
}

/**
 * Updates the device matrix markdown file
 */
async function updateDeviceMatrix() {
  try {
    console.log('📊 Updating device compatibility matrix...');
    
    // Load the processed devices
    if (!fs.existsSync(DEVICES_FILE)) {
      throw new Error('Processed devices file not found. Run the fetch script first.');
    }
    
    const devices = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
    const supportedDevices = loadSupportedDevices();
    
    // Filter for Tuya devices
    const tuyaDevices = devices.filter(device => device.isTuya);
    console.log(`Found ${tuyaDevices.length} Tuya devices in the dataset.`);
    
    // Create a map of supported devices for quick lookup
    const supportedDevicesMap = new Map(
      supportedDevices.map(device => [`${device.manufacturer}:${device.model}`, device])
    );
    
    // Generate the markdown table
    const tableData = [
      [
        'Model', 
        'Description', 
        'Manufacturer', 
        'Status', 
        'Type',
        'Notes'
      ]
    ];
    
    // Sort devices by manufacturer and model
    tuyaDevices.sort((a, b) => {
      if (a.manufacturer === b.manufacturer) {
        return a.model.localeCompare(b.model);
      }
      return a.manufacturer.localeCompare(b.manufacturer);
    });
    
    // Add device rows to the table
    tuyaDevices.forEach(device => {
      const deviceKey = `${device.manufacturer}:${device.model}`;
      const isSupported = supportedDevicesMap.has(deviceKey);
      const supportedDevice = isSupported ? supportedDevicesMap.get(deviceKey) : null;
      
      let status = '❌ Not Supported';
      if (isSupported) {
        status = supportedDevice.status === 'beta' ? '🟡 Beta' : '✅ Supported';
      }
      
      // Add a link to the device documentation if available
      const modelCell = device.url 
        ? `[${device.model}](${device.url})` 
        : device.model;
      
      tableData.push([
        modelCell,
        device.description,
        device.manufacturer,
        status,
        device.type.replace(/_/g, ' '),
        supportedDevice?.notes || ''
      ]);
    });
    
    // Generate the markdown content
    const markdown = `# Tuya Zigbee Device Compatibility Matrix

> Last updated: ${new Date().toISOString()}

This document contains the compatibility status of Tuya Zigbee devices with the Homey integration.

## Legend
- ✅ Fully Supported
- 🟡 Beta/Partial Support
- ❌ Not Supported

## Device List

${generateMarkdownTable(tableData)}

## Adding New Devices

To request support for a new device, please [open an issue](https://github.com/your-repo/issues/new?template=device-request.md) with the device details.

## Contributing

Contributions to add support for new devices are welcome! Please see our [contribution guidelines](CONTRIBUTING.md) for more information.
`;
    
    // Write the markdown file
    fs.writeFileSync(MATRIX_FILE, markdown);
    console.log(`✅ Device matrix updated: ${MATRIX_FILE}`);
    
    // Generate a summary
    const supportedCount = tuyaDevices.filter(d => 
      supportedDevicesMap.has(`${d.manufacturer}:${d.model}`)
    ).length;
    
    console.log('\n📊 Device Support Summary:');
    console.log(`- Total Tuya devices: ${tuyaDevices.length}`);
    console.log(`- Supported devices: ${supportedCount} (${Math.round((supportedCount / tuyaDevices.length) * 100)}%)`);
    console.log(`- Unsupported devices: ${tuyaDevices.length - supportedCount}`);
    
  } catch (error) {
    console.error('❌ Error updating device matrix:', error);
    throw error;
  }
}

/**
 * Generates a markdown table from a 2D array
 */
function generateMarkdownTable(data) {
  if (!data || data.length === 0) return '';
  
  // Generate the header
  const header = data[0];
  const separator = header.map(() => '---');
  const table = [
    header,
    separator,
    ...data.slice(1)
  ];
  
  // Convert to markdown table rows
  return table.map(row => `| ${row.join(' | ')} |`).join('\n');
}

// Run the script
updateDeviceMatrix().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
