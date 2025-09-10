const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const BLAKADDER_URL = 'https://raw.githubusercontent.com/blakadder/zigbee/HEAD/devices.json';
const OUTPUT_FILE = path.join(__dirname, '../../resources/blakadder-devices.json');

async function fetchBlakadderDevices() {
  try {
    console.log('🌐 Fetching devices from Blakadder/zigbee...');
    
    // Fetch the raw JSON data
    const { data } = await axios.get(BLAKADDER_URL);
    
    // Process the data to extract relevant information
    const devices = Object.entries(data).map(([id, device]) => ({
      id,
      name: device.name || '',
      vendor: device.vendor || 'Unknown',
      model: device.model || '',
      description: device.description || '',
      exposes: device.exposes || [],
      supports: device.supports || [],
      fromZigbee: device.fromZigbee || [],
      toZigbee: device.toZigbee || [],
      source: 'blakadder/zigbee',
      lastUpdated: new Date().toISOString()
    }));
    
    // Save to file
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(devices, null, 2));
    console.log(`✅ Saved ${devices.length} devices to ${OUTPUT_FILE}`);
    return devices;
  } catch (error) {
    console.error('❌ Error fetching Blakadder devices:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fetchBlakadderDevices().catch(console.error);
}

module.exports = fetchBlakadderDevices;
