const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const DUMPS_DIR = path.join(__dirname, '..', 'dumps');
const OUTPUT_DIR = path.join(__dirname, '..', 'references');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'device-dump.json');

// Known device patterns
const DEVICE_PATTERNS = [
  { 
    name: 'TS011F',
    pattern: /TS011F/i,
    type: 'socket',
    capabilities: ['onoff', 'measure_power', 'meter_power']
  },
  {
    name: 'TRV602',
    pattern: /TRV602/i,
    type: 'thermostat',
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery']
  },
  {
    name: 'Motion Sensor',
    pattern: /motion|presence/i,
    type: 'sensor',
    capabilities: ['alarm_motion', 'measure_battery']
  },
  {
    name: 'Contact Sensor',
    pattern: /contact|door|window/i,
    type: 'sensor',
    capabilities: ['alarm_contact', 'measure_battery']
  },
  {
    name: 'Button',
    pattern: /button|switch/i,
    type: 'sensor',
    capabilities: ['button']
  }
];

async function processDumps() {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Check if dumps directory exists
    if (!fs.existsSync(DUMPS_DIR)) {
      console.error(`Dumps directory not found: ${DUMPS_DIR}`);
      return [];
    }

    // Get all JSON files in the dumps directory
    const files = fs.readdirSync(DUMPS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(DUMPS_DIR, file));

    if (files.length === 0) {
      console.log('No dump files found in the dumps directory');
      return [];
    }

    const devices = [];
    const processedFiles = [];

    // Process each dump file
    for (const file of files) {
      try {
        console.log(`Processing ${path.basename(file)}...`);
        const content = await readFile(file, 'utf8');
        const data = JSON.parse(content);
        
        // Extract devices from the dump
        const extractedDevices = extractDevices(data);
        devices.push(...extractedDevices);
        processedFiles.push(file);
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }

    // Save the extracted devices
    if (devices.length > 0) {
      await writeFile(OUTPUT_FILE, JSON.stringify(devices, null, 2));
      console.log(`\nExtracted ${devices.length} devices to ${OUTPUT_FILE}`);
    } else {
      console.log('No devices were extracted from the dumps');
    }

    // Generate a summary report
    const report = generateReport(devices, processedFiles);
    const reportFile = path.join(OUTPUT_DIR, 'dump-report.md');
    await writeFile(reportFile, report);
    console.log(`\nReport generated at: ${reportFile}`);

    return devices;
  } catch (error) {
    console.error('Error processing dumps:', error);
    throw error;
  }
}

function extractDevices(data) {
  const devices = [];
  
  // Handle different dump formats
  if (Array.isArray(data)) {
    // If the dump is an array of devices
    for (const item of data) {
      const device = processDevice(item);
      if (device) devices.push(device);
    }
  } else if (typeof data === 'object' && data !== null) {
    // If the dump is an object with devices in a property
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        // If the property is an array of devices
        for (const item of value) {
          const device = processDevice(item);
          if (device) devices.push(device);
        }
      } else if (typeof value === 'object' && value !== null) {
        // If the property is a single device
        const device = processDevice(value);
        if (device) devices.push(device);
      }
    }
  }

  return devices;
}

function processDevice(deviceData) {
  try {
    // Extract basic device information
    const modelId = deviceData.modelId || deviceData.model || deviceData.id || '';
    const manufacturer = deviceData.manufacturer || deviceData.brand || 'Unknown';
    const description = deviceData.description || deviceData.name || '';
    
    if (!modelId) return null;

    // Determine device type and capabilities based on patterns
    let type = 'unknown';
    let capabilities = [];
    
    for (const pattern of DEVICE_PATTERNS) {
      if (modelId.match(pattern.pattern) || 
          description.match(pattern.pattern) ||
          (deviceData.name && deviceData.name.match(pattern.pattern))) {
        type = pattern.type;
        capabilities = [...new Set([...capabilities, ...pattern.capabilities])];
      }
    }

    // Extract additional metadata
    const metadata = {};
    if (deviceData.endpoints) metadata.endpoints = deviceData.endpoints;
    if (deviceData.clusters) metadata.clusters = deviceData.clusters;
    if (deviceData.firmwareVersion) metadata.firmwareVersion = deviceData.firmwareVersion;

    return {
      model: modelId,
      manufacturer,
      description,
      type,
      capabilities,
      metadata,
      source: 'dump',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing device:', error);
    return null;
  }
}

function generateReport(devices, processedFiles) {
  let report = '# Device Dump Processing Report\n\n';
  report += `**Generated at:** ${new Date().toLocaleString()}\n\n`;
  
  // Summary
  report += '## 📊 Summary\n\n';
  report += `- **Total Devices Extracted:** ${devices.length}\n`;
  report += `- **Files Processed:** ${processedFiles.length}\n\n`;
  
  // Devices by type
  const devicesByType = {};
  for (const device of devices) {
    devicesByType[device.type] = (devicesByType[device.type] || 0) + 1;
  }
  
  report += '## 📦 Devices by Type\n\n';
  report += '| Type | Count |\n';
  report += '|------|-------|\n';
  for (const [type, count] of Object.entries(devicesByType)) {
    report += `| ${type} | ${count} |\n`;
  }
  report += '\n';
  
  // Processed files
  report += '## 📂 Processed Files\n\n';
  for (const file of processedFiles) {
    report += `- ${path.basename(file)}\n`;
  }
  report += '\n';
  
  // Device details
  report += '## 📋 Device Details\n\n';
  report += '| Model | Manufacturer | Type | Capabilities |\n';
  report += '|-------|--------------|------|--------------|\n';
  
  for (const device of devices) {
    report += `| ${device.model} `;
    report += `| ${device.manufacturer} `;
    report += `| ${device.type} `;
    report += `| ${device.capabilities.join(', ')} |\n`;
  }
  
  return report;
}

// Run the dump processing
processDumps().catch(console.error);
