const fs = require('fs').promises;
const path = require('path');
const { CLUSTER } = require('zigbee-clusters');

class MatrixGenerator {
  constructor() {
    this.deviceMatrix = {};
    this.clusterMatrix = {};
    this.supportedClusters = new Set();
    this.supportedManufacturers = new Set();
  }

  async generateMatrices() {
    console.log('🚀 Generating device and cluster matrices...');
    
    // Process all device drivers
    await this.processDriversDirectory('drivers/tuya');
    await this.processDriversDirectory('drivers/zigbee');
    
    // Generate the matrices
    await this.generateDeviceMatrix();
    await this.generateClusterMatrix();
    
    console.log('✅ Matrices generated successfully!');
  }

  async processDriversDirectory(baseDir) {
    try {
      const categories = await fs.readdir(baseDir);
      
      for (const category of categories) {
        const categoryPath = path.join(baseDir, category);
        const stat = await fs.stat(categoryPath);
        
        if (stat.isDirectory()) {
          const drivers = await fs.readdir(categoryPath);
          
          for (const driver of drivers) {
            const driverPath = path.join(categoryPath, driver);
            const driverStat = await fs.stat(driverPath);
            
            if (driverStat.isDirectory()) {
              await this.processDriver(driverPath, category, driver);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${baseDir}:`, error.message);
    }
  }

  async processDriver(driverPath, category, driverName) {
    try {
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      // Skip if no compose file exists
      try {
        await fs.access(composePath);
      } catch {
        return; // Skip this driver
      }
      
      const composeData = JSON.parse(await fs.readFile(composePath, 'utf8'));
      
      // Extract device information
      const deviceInfo = {
        id: composeData.id || driverName,
        name: composeData.name?.en || driverName,
        category,
        manufacturer: composeData.zigbee?.manufacturerName || 'Unknown',
        model: composeData.zigbee?.modelId?.[0] || 'Unknown',
        clusters: new Set(),
        capabilities: composeData.capabilities || [],
        endpoints: {}
      };
      
      // Process endpoints and clusters
      if (composeData.zigbee?.endpoints) {
        for (const [endpointId, endpoint] of Object.entries(composeData.zigbee.endpoints)) {
          const clusters = endpoint.clusters || [];
          deviceInfo.endpoints[endpointId] = {
            clusters,
            bindings: endpoint.bindings || []
          };
          
          // Add to cluster set
          clusters.forEach(cluster => {
            deviceInfo.clusters.add(cluster);
            this.supportedClusters.add(cluster);
          });
        }
      }
      
      // Add to device matrix
      const deviceKey = `${deviceInfo.manufacturer}_${deviceInfo.model}`;
      this.deviceMatrix[deviceKey] = deviceInfo;
      this.supportedManufacturers.add(deviceInfo.manufacturer);
      
    } catch (error) {
      console.error(`Error processing driver ${driverPath}:`, error.message);
    }
  }

  async generateDeviceMatrix() {
    const matrix = [
      ['Manufacturer', 'Model', 'Category', 'Clusters', 'Capabilities', 'Endpoints']
    ];
    
    // Sort devices by manufacturer and model
    const sortedDevices = Object.values(this.deviceMatrix).sort((a, b) => {
      return a.manufacturer.localeCompare(b.manufacturer) || 
             a.model.localeCompare(b.model);
    });
    
    // Add device rows
    for (const device of sortedDevices) {
      matrix.push([
        device.manufacturer,
        device.model,
        device.category,
        Array.from(device.clusters).map(c => this.getClusterName(c)).join(', '),
        device.capabilities.join(', '),
        Object.keys(device.endpoints).length
      ]);
    }
    
    // Save to file
    await this.saveMatrix('device-matrix.csv', matrix);
    
    // Also save as JSON for easier processing
    await fs.writeFile(
      path.join('matrices', 'device-matrix.json'),
      JSON.stringify(sortedDevices, null, 2)
    );
  }

  async generateClusterMatrix() {
    const clusters = Array.from(this.supportedClusters).sort((a, b) => a - b);
    const manufacturers = Array.from(this.supportedManufacturers).sort();
    
    // Create header row
    const header = ['Cluster', ...manufacturers];
    const matrix = [header];
    
    // Add cluster rows
    for (const cluster of clusters) {
      const row = [this.getClusterName(cluster)];
      
      for (const manufacturer of manufacturers) {
        // Count devices from this manufacturer that support this cluster
        const count = Object.values(this.deviceMatrix).filter(device => 
          device.manufacturer === manufacturer && 
          device.clusters.has(parseInt(cluster))
        ).length;
        
        row.push(count > 0 ? '✓' : '');
      }
      
      matrix.push(row);
    }
    
    // Save to file
    await this.saveMatrix('cluster-matrix.csv', matrix);
    
    // Also save cluster definitions
    await this.saveClusterDefinitions(clusters);
  }

  getClusterName(clusterId) {
    const hexId = '0x' + parseInt(clusterId).toString(16).padStart(4, '0');
    
    // Try to find a matching cluster name
    for (const [name, id] of Object.entries(CLUSTER)) {
      if (id === parseInt(clusterId)) {
        return `${name} (${hexId})`;
      }
    }
    
    return `Unknown (${hexId})`;
  }

  async saveMatrix(filename, matrix) {
    // Ensure matrices directory exists
    await fs.mkdir('matrices', { recursive: true });
    
    // Convert to CSV
    const csv = matrix.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Write to file
    await fs.writeFile(path.join('matrices', filename), csv);
    console.log(`✅ Generated ${filename}`);
  }

  async saveClusterDefinitions(clusters) {
    const definitions = [];
    
    for (const clusterId of clusters) {
      const hexId = '0x' + parseInt(clusterId).toString(16).padStart(4, '0');
      let name = `Unknown (${hexId})`;
      
      // Find cluster name
      for (const [clusterName, id] of Object.entries(CLUSTER)) {
        if (id === parseInt(clusterId)) {
          name = clusterName;
          break;
        }
      }
      
      // Count devices with this cluster
      const deviceCount = Object.values(this.deviceMatrix).filter(device => 
        device.clusters.has(parseInt(clusterId))
      ).length;
      
      definitions.push({
        id: parseInt(clusterId),
        hexId,
        name,
        deviceCount
      });
    }
    
    // Sort by device count (descending)
    definitions.sort((a, b) => b.deviceCount - a.deviceCount);
    
    // Save to file
    await fs.writeFile(
      path.join('matrices', 'cluster-definitions.json'),
      JSON.stringify(definitions, null, 2)
    );
    
    console.log('✅ Generated cluster-definitions.json');
  }
}

// Run the generator
(async () => {
  try {
    const generator = new MatrixGenerator();
    await generator.generateMatrices();
  } catch (error) {
    console.error('Error generating matrices:', error);
    process.exit(1);
  }
})();
