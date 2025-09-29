const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../../resources/device-data');
const Z2M_DEVICES_URL = 'https://www.zigbee2mqtt.io/supported-devices/';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetches and parses the list of supported devices from Zigbee2MQTT website
 */
async function fetchZigbee2MQTTDevices() {
  try {
    console.log('🔍 Fetching supported devices from Zigbee2MQTT...');
    
    // Fetch the HTML content
    const response = await axios.get(Z2M_DEVICES_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Parse the HTML to extract device information
    const devices = parseDevicesFromHTML(response.data);
    
    // Save the raw data
    const outputPath = path.join(OUTPUT_DIR, 'zigbee2mqtt-devices.json');
    fs.writeFileSync(outputPath, JSON.stringify(devices, null, 2));
    
    console.log(`✅ Successfully saved ${devices.length} devices to ${outputPath}`);
    return devices;
  } catch (error) {
    console.error('❌ Error fetching devices:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Parses HTML content to extract device information
 */
function parseDevicesFromHTML(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const devices = [];
  
  // Find all device rows in the table
  const rows = document.querySelectorAll('table.device-table tbody tr');
  
  rows.forEach(row => {
    try {
      const columns = row.querySelectorAll('td');
      if (columns.length >= 3) {
        const model = columns[0].textContent.trim();
        const description = columns[1].textContent.trim();
        const manufacturer = columns[2].textContent.trim();
        
        // Extract the device URL if available
        const link = columns[0].querySelector('a');
        const url = link ? new URL(link.href, Z2M_DEVICES_URL).href : null;
        
        // Extract the device image if available
        const img = columns[0].querySelector('img');
        const imageUrl = img ? new URL(img.src, Z2M_DEVICES_URL).href : null;
        
        devices.push({
          model,
          description,
          manufacturer,
          url,
          imageUrl,
          source: 'zigbee2mqtt',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Error parsing device row:', error);
    }
  });
  
  return devices;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Zigbee2MQTT device data collection...');
    const devices = await fetchZigbee2MQTTDevices();
    
    // Process the devices to extract additional information
    console.log('🔧 Processing device data...');
    const processedDevices = processDevices(devices);
    
    // Save the processed data
    const processedPath = path.join(OUTPUT_DIR, 'processed-devices.json');
    fs.writeFileSync(processedPath, JSON.stringify(processedDevices, null, 2));
    
    console.log(`✅ Successfully processed ${processedDevices.length} devices`);
    console.log(`📊 Results saved to: ${processedPath}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

/**
 * Processes the raw device data to extract additional information
 */
function processDevices(devices) {
  return devices.map(device => {
    // Extract additional information from the model or description
    const isTuya = device.manufacturer.toLowerCase().includes('tuya') || 
                  device.model.toLowerCase().includes('tuya') ||
                  device.description.toLowerCase().includes('tuya');
    
    // Extract device type from description
    let type = 'other';
    const lowerDesc = device.description.toLowerCase();
    
    if (lowerDesc.includes('sensor')) {
      if (lowerDesc.includes('motion') || lowerDesc.includes('presence')) {
        type = 'motion_sensor';
      } else if (lowerDesc.includes('temperature') || lowerDesc.includes('humidity')) {
        type = 'climate_sensor';
      } else if (lowerDesc.includes('contact') || lowerDesc.includes('door') || lowerDesc.includes('window')) {
        type = 'contact_sensor';
      } else if (lowerDesc.includes('water') || lowerDesc.includes('leak')) {
        type = 'water_leak_sensor';
      } else {
        type = 'sensor';
      }
    } else if (lowerDesc.includes('switch') || lowerDesc.includes('plug') || lowerDesc.includes('outlet')) {
      type = 'switch';
    } else if (lowerDesc.includes('light') || lowerDesc.includes('bulb') || lowerDesc.includes('lamp')) {
      type = 'light';
    } else if (lowerDesc.includes('remote') || lowerDesc.includes('button')) {
      type = 'remote';
    } else if (lowerDesc.includes('lock') || lowerDesc.includes('door lock')) {
      type = 'lock';
    } else if (lowerDesc.includes('thermostat') || lowerDesc.includes('radiator')) {
      type = 'thermostat';
    } else if (lowerDesc.includes('curtain') || lowerDesc.includes('blind')) {
      type = 'cover';
    }
    
    // Extract model number if possible
    const modelNumberMatch = device.model.match(/[A-Z]{1,3}[0-9]{2,4}[A-Z]?/);
    const modelNumber = modelNumberMatch ? modelNumberMatch[0] : null;
    
    return {
      ...device,
      type,
      isTuya,
      modelNumber,
      supported: false, // Will be updated during processing
      notes: ''
    };
  });
}

// Run the main function
main();
