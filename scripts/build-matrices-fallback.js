const fs = require('fs').promises;
const path = require('path');

// Load collected data
const loadData = async (filename) => {
  try {
    const data = await fs.readFile(path.join(__dirname, '../resources', filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠️  Could not load ${filename}, using empty array`);
    return [];
  }
};

// Capabilities mapping based on Homey documentation
const CAPABILITY_MAP = {
  'onoff': ['switch', 'state'],
  'dim': ['brightness', 'level'],
  'light_hue': ['color_hs', 'hue'],
  'light_saturation': ['color_hs', 'saturation'],
  'light_temperature': ['color_temp'],
  'measure_temperature': ['temperature'],
  'measure_humidity': ['humidity'],
  'measure_battery': ['battery'],
  'alarm_motion': ['occupancy'],
  'alarm_contact': ['contact'],
  'alarm_water': ['water_leak'],
  'alarm_smoke': ['smoke'],
  'alarm_co': ['carbon_monoxide'],
  'meter_power': ['power'],
  'meter_energy': ['energy']
};

async function buildMatrices() {
  console.log('🔧 Building matrices from collected data...\n');
  
  const matricesDir = path.join(__dirname, '../matrices');
  await fs.mkdir(matricesDir, { recursive: true });
  
  try {
    // Load source data
    const z2mData = await loadData('zigbee2mqtt-devices.json');
    const blaData = await loadData('blakadder-devices.json');
    const userPatches = await loadData('user-patches.json');
    
    // Build DEVICE_MATRIX.csv
    const deviceMatrix = [];
    
    // Process Zigbee2MQTT data
    z2mData.forEach(device => {
      const patches = userPatches.filter(p => p.device === device.model);
      deviceMatrix.push({
        model: device.model,
        vendor: device.vendor,
        description: device.description,
        capabilities: device.exposes?.join(';') || '',
        clusters: '0x0006,0x0000', // Basic on/off clusters
        source: 'zigbee2mqtt',
        status: 'supported',
        patches_applied: patches.length,
        last_updated: device.lastUpdated
      });
    });
    
    // Process Blakadder data
    blaData.forEach(device => {
      const patches = userPatches.filter(p => p.device === device.model);
      deviceMatrix.push({
        model: device.model,
        vendor: device.vendor,
        description: device.description,
        capabilities: device.supports || '',
        clusters: '0x0006,0x0000',
        source: 'blakadder',
        status: 'supported',
        patches_applied: patches.length,
        last_updated: device.lastUpdated || new Date().toISOString()
      });
    });
    
    // Build CLUSTER_MATRIX.csv
    const clusterMatrix = [
      { cluster_id: '0x0000', cluster_name: 'Basic', capability: 'identify', description: 'Device identification' },
      { cluster_id: '0x0001', cluster_name: 'Power Configuration', capability: 'measure_battery', description: 'Battery level' },
      { cluster_id: '0x0003', cluster_name: 'Identify', capability: 'identify', description: 'Identify device' },
      { cluster_id: '0x0004', cluster_name: 'Groups', capability: '', description: 'Group management' },
      { cluster_id: '0x0005', cluster_name: 'Scenes', capability: '', description: 'Scene management' },
      { cluster_id: '0x0006', cluster_name: 'On/Off', capability: 'onoff', description: 'On/off control' },
      { cluster_id: '0x0008', cluster_name: 'Level Control', capability: 'dim', description: 'Brightness control' },
      { cluster_id: '0x0300', cluster_name: 'Color Control', capability: 'light_hue,light_saturation,light_temperature', description: 'Color control' },
      { cluster_id: '0x0402', cluster_name: 'Temperature Measurement', capability: 'measure_temperature', description: 'Temperature sensor' },
      { cluster_id: '0x0405', cluster_name: 'Relative Humidity', capability: 'measure_humidity', description: 'Humidity sensor' },
      { cluster_id: '0x0406', cluster_name: 'Occupancy Sensing', capability: 'alarm_motion', description: 'Motion detection' },
      { cluster_id: '0x0500', cluster_name: 'IAS Zone', capability: 'alarm_contact,alarm_smoke,alarm_water', description: 'Security sensors' }
    ];
    
    // Save DEVICE_MATRIX.csv
    const deviceCsvPath = path.join(matricesDir, 'DEVICE_MATRIX.csv');
    const deviceCsv = [
      'model,vendor,description,capabilities,clusters,source,status,patches_applied,last_updated',
      ...deviceMatrix.map(d => 
        `${d.model},${d.vendor},"${d.description}","${d.capabilities}","${d.clusters}",${d.source},${d.status},${d.patches_applied},${d.last_updated}`
      )
    ].join('\n');
    
    await fs.writeFile(deviceCsvPath, deviceCsv);
    console.log(`✅ DEVICE_MATRIX.csv created with ${deviceMatrix.length} devices`);
    
    // Save CLUSTER_MATRIX.csv
    const clusterCsvPath = path.join(matricesDir, 'CLUSTER_MATRIX.csv');
    const clusterCsv = [
      'cluster_id,cluster_name,capability,description',
      ...clusterMatrix.map(c => 
        `${c.cluster_id},${c.cluster_name},"${c.capability}","${c.description}"`
      )
    ].join('\n');
    
    await fs.writeFile(clusterCsvPath, clusterCsv);
    console.log(`✅ CLUSTER_MATRIX.csv created with ${clusterMatrix.length} mappings`);
    
    // Save JSON versions
    await fs.writeFile(
      path.join(matricesDir, 'device-matrix.json'),
      JSON.stringify(deviceMatrix, null, 2)
    );
    
    await fs.writeFile(
      path.join(matricesDir, 'cluster-matrix.json'),
      JSON.stringify(clusterMatrix, null, 2)
    );
    
    console.log('\n📊 Matrices built successfully!');
    console.log(`📁 Files saved to: ${matricesDir}/`);
    
    return {
      devices: deviceMatrix.length,
      clusters: clusterMatrix.length,
      files: [deviceCsvPath, clusterCsvPath]
    };
    
  } catch (error) {
    console.error('❌ Error building matrices:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  buildMatrices().catch(console.error);
}

module.exports = { buildMatrices };
