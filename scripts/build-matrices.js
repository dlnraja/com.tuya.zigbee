const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

// Configuration
const RESOURCES_DIR = path.join(__dirname, '..', 'resources');
const OUTPUT_DIR = path.join(__dirname, '..', 'matrices');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Load and parse a JSON file, returning an empty array if the file doesn't exist
 */
function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    console.warn(`⚠️  File not found: ${filePath}`);
    return [];
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Save data to a JSON file
 */
function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${data.length} items to ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.error(`❌ Error saving ${filePath}:`, error.message);
  }
}

/**
 * Save data to a CSV file
 */
function saveCsvFile(filePath, data, columns) {
  try {
    const csvContent = stringify(data, { header: true, columns });
    fs.writeFileSync(filePath, csvContent);
    console.log(`✅ Saved ${data.length} rows to ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.error(`❌ Error saving CSV ${filePath}:`, error.message);
  }
}

/**
 * Build the device matrix from all sources
 */
function buildDeviceMatrix() {
  console.log('\n🔨 Building device matrix...');
  
  // Load data from all sources
  const z2mDevices = loadJsonFile(path.join(RESOURCES_DIR, 'zigbee2mqtt-devices.json'));
  const blakadderDevices = loadJsonFile(path.join(RESOURCES_DIR, 'blakadder-devices.json'));
  const forumAnalysis = loadJsonFile(path.join(RESOURCES_DIR, 'forum-analysis.json'));
  
  // Create a map of devices by model for quick lookup
  const devicesMap = new Map();
  
  // Process Zigbee2MQTT devices
  z2mDevices.forEach(device => {
    if (device.model) {
      devicesMap.set(device.model, {
        model: device.model,
        description: device.description || '',
        manufacturer: device.manufacturer || device.vendor || 'Tuya',
        source: 'zigbee2mqtt',
        url: device.url || '',
        capabilities: [],
        clusters: [],
        issues: []
      });
    }
  });
  
  // Process Blakadder devices
  blakadderDevices.forEach(device => {
    if (device.model) {
      const existing = devicesMap.get(device.model) || {
        model: device.model,
        description: device.description || '',
        manufacturer: device.vendor || 'Tuya',
        source: 'blakadder',
        url: '',
        capabilities: [],
        clusters: [],
        issues: []
      };
      
      // Merge data
      existing.capabilities = [...new Set([
        ...(existing.capabilities || []),
        ...(device.supports || []),
        ...(device.exposes || [])
      ])];
      
      existing.clusters = [...new Set([
        ...(existing.clusters || []),
        ...(device.fromZigbee || []),
        ...(device.toZigbee || [])
      ])];
      
      if (device.source !== 'blakadder') {
        existing.source = `${existing.source},blakadder`;
      }
      
      devicesMap.set(device.model, existing);
    }
  });
  
  // Process forum issues to find device-related problems
  forumAnalysis.forEach(entry => {
    const models = entry.deviceMentions || [];
    const context = (entry.issues && entry.issues[0]?.context) || '';
    models.forEach(model => {
      if (devicesMap.has(model)) {
        const device = devicesMap.get(model);
        device.issues = [...(device.issues || []), {
          type: 'forum_issue',
          url: entry.url,
          summary: (context || '').substring(0, 120) + (context.length > 120 ? '...' : ''),
          patches: (entry.issues || []).filter(i => i.type === 'fix')
        }];
      }
    });
  });
  
  // Convert map to array
  const devices = Array.from(devicesMap.values());
  
  // Save as JSON
  saveJsonFile(path.join(OUTPUT_DIR, 'device-matrix.json'), devices);
  
  // Save as CSV
  const deviceCsvData = devices.map(device => ({
    model: device.model,
    manufacturer: device.manufacturer,
    description: device.description,
    source: device.source,
    capabilities: device.capabilities.join('; '),
    clusters: device.clusters.join('; '),
    issue_count: device.issues?.length || 0,
    url: device.url
  }));
  
  const csvColumns = [
    'model', 'manufacturer', 'description', 'source', 
    'capabilities', 'clusters', 'issue_count', 'url'
  ];
  
  saveCsvFile(
    path.join(OUTPUT_DIR, 'DEVICE_MATRIX.csv'),
    deviceCsvData,
    csvColumns
  );
  
  return devices;
}

/**
 * Build the cluster matrix
 */
function buildClusterMatrix(devices) {
  console.log('\n🔨 Building cluster matrix...');
  
  // Extract all unique clusters and capabilities
  const clusters = new Set();
  const capabilities = new Set();
  
  devices.forEach(device => {
    (device.clusters || []).forEach(cluster => clusters.add(cluster));
    (device.capabilities || []).forEach(cap => capabilities.add(cap));
  });
  
  // Create a mapping of clusters to capabilities
  const clusterCapabilityMap = new Map();
  
  // This is a simplified mapping - in a real scenario, you'd want to define this
  // based on the Zigbee cluster specification or your device implementation
  const predefinedMappings = {
    'genBasic': ['device_name', 'device_manufacturer'],
    'genOnOff': ['onoff'],
    'genLevelCtrl': ['dim', 'light_hue', 'light_saturation'],
    'genPowerCfg': ['measure_battery', 'alarm_battery'],
    'msTemperatureMeasurement': ['measure_temperature'],
    'msRelativeHumidity': ['measure_humidity'],
    'msPressureMeasurement': ['measure_pressure'],
    'msOccupancySensing': ['alarm_motion'],
    'msIlluminanceMeasurement': ['measure_luminance'],
    'manuSpecificTuya': ['*'] // Tuya-specific clusters might have multiple capabilities
  };
  
  // Apply predefined mappings
  Object.entries(predefinedMappings).forEach(([cluster, caps]) => {
    if (clusters.has(cluster)) {
      clusterCapabilityMap.set(cluster, caps);
    }
  });
  
  // Create cluster matrix data
  const clusterData = [];
  
  for (const cluster of clusters) {
    const capabilities = clusterCapabilityMap.get(cluster) || [];
    
    clusterData.push({
      cluster,
      capabilities: capabilities.join('; '),
      description: getClusterDescription(cluster),
      zigbee_cluster: cluster,
      homey_capability: capabilities[0] || '',
      implementation_status: capabilities.length > 0 ? 'implemented' : 'pending'
    });
  }
  
  // Save as JSON
  saveJsonFile(path.join(OUTPUT_DIR, 'cluster-matrix.json'), clusterData);
  
  // Save as CSV
  saveCsvFile(
    path.join(OUTPUT_DIR, 'CLUSTER_MATRIX.csv'),
    clusterData,
    ['cluster', 'description', 'capabilities', 'zigbee_cluster', 'homey_capability', 'implementation_status']
  );
  
  return clusterData;
}

/**
 * Get a human-readable description for a cluster
 */
function getClusterDescription(cluster) {
  const descriptions = {
    'genBasic': 'Basic cluster for device information',
    'genOnOff': 'On/Off control for lights and switches',
    'genLevelCtrl': 'Level control for dimming and color control',
    'genPowerCfg': 'Power configuration and battery monitoring',
    'msTemperatureMeasurement': 'Temperature measurement',
    'msRelativeHumidity': 'Relative humidity measurement',
    'msPressureMeasurement': 'Pressure measurement',
    'msOccupancySensing': 'Occupancy (motion) sensing',
    'msIlluminanceMeasurement': 'Illuminance (light level) measurement',
    'manuSpecificTuya': 'Tuya manufacturer-specific cluster'
  };
  
  return descriptions[cluster] || `Zigbee ${cluster} cluster`;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Building device and cluster matrices...');
  
  // Build device matrix
  const devices = buildDeviceMatrix();
  
  // Build cluster matrix
  buildClusterMatrix(devices);
  
  console.log('\n✅ Matrices generated successfully!');
  console.log(`📊 Check the 'matrices' directory for the generated files.`);
}

// Run the main function
main();
