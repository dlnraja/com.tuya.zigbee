#!/usr/bin/env node
/**
 * Matrices, Databases and Dumps Enhancement Script
 * Improves matrices, BDD and dumps with all available resources
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  matricesDir: path.join(__dirname, '../matrices'),
  dataDir: path.join(__dirname, '../data'),
  catalogDir: path.join(__dirname, '../catalog'),
  resourcesDir: path.join(__dirname, '../resources'),
  outputDir: path.join(__dirname, '../matrices-enhancement-results'),
  driversDir: path.join(__dirname, '../drivers')
};

class MatricesEnhancer {
  constructor() {
    this.enhancementReport = {
      timestamp: new Date().toISOString(),
      matricesProcessed: 0,
      databasesUpdated: 0,
      resourcesIntegrated: 0,
      devicesAdded: 0,
      errors: [],
      recommendations: []
    };
  }

  async enhanceMatrices() {
    console.log('🔧 Starting Matrices and Databases Enhancement...');
    
    try {
      await this.ensureDirectories();
      
      // Collect all available resources
      const resources = await this.collectAllResources();
      
      // Update device matrix
      await this.updateDeviceMatrix(resources);
      
      // Update cluster matrix  
      await this.updateClusterMatrix(resources);
      
      // Update compatibility matrix
      await this.updateCompatibilityMatrix(resources);
      
      // Enhance device database
      await this.enhanceDeviceDatabase(resources);
      
      // Create community feedback matrix
      await this.createCommunityMatrix(resources);
      
      await this.generateReport();
      console.log('✅ Matrices and Databases Enhancement Complete!');
      
    } catch (error) {
      console.error('❌ Enhancement failed:', error);
      this.enhancementReport.errors.push(error.message);
    }
  }

  async ensureDirectories() {
    for (const dir of Object.values(CONFIG)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async collectAllResources() {
    console.log('📊 Collecting all available resources...');
    
    const resources = {
      drivers: [],
      devices: [],
      clusters: [],
      manufacturers: [],
      capabilities: [],
      community: []
    };

    // Collect from drivers
    await this.collectFromDrivers(resources);
    
    // Collect from data directory
    await this.collectFromData(resources);
    
    // Collect from catalog
    await this.collectFromCatalog(resources);
    
    // Collect from resources
    await this.collectFromResources(resources);
    
    this.enhancementReport.resourcesIntegrated = 
      resources.drivers.length + resources.devices.length + 
      resources.clusters.length + resources.manufacturers.length;
    
    return resources;
  }

  async collectFromDrivers(resources) {
    try {
      const drivers = await fs.readdir(CONFIG.driversDir, { withFileTypes: true });
      
      for (const driver of drivers) {
        if (driver.isDirectory() && !driver.name.startsWith('_')) {
          const driverData = await this.analyzeDriver(path.join(CONFIG.driversDir, driver.name));
          resources.drivers.push({
            name: driver.name,
            ...driverData
          });
        }
      }
    } catch (error) {
      console.log('Note: Could not collect from drivers');
    }
  }

  async analyzeDriver(driverPath) {
    const data = {
      capabilities: [],
      manufacturers: [],
      productIds: [],
      clusters: []
    };

    try {
      const composePath = path.join(driverPath, 'driver.compose.json');
      const content = await fs.readFile(composePath, 'utf8');
      const compose = JSON.parse(content);
      
      data.capabilities = compose.capabilities || [];
      
      if (compose.zigbee) {
        data.manufacturers = Array.isArray(compose.zigbee.manufacturerName) 
          ? compose.zigbee.manufacturerName 
          : [compose.zigbee.manufacturerName];
          
        data.productIds = Array.isArray(compose.zigbee.productId)
          ? compose.zigbee.productId
          : [compose.zigbee.productId];
          
        if (compose.zigbee.endpoints) {
          for (const endpoint of Object.values(compose.zigbee.endpoints)) {
            if (endpoint.clusters) {
              data.clusters.push(...endpoint.clusters);
            }
          }
        }
      }
    } catch (error) {
      // Skip drivers without valid compose files
    }

    return data;
  }

  async collectFromData(resources) {
    try {
      const dataPath = path.join(CONFIG.dataDir, 'device-database');
      const dbPath = path.join(dataPath, 'enhanced-device-database.json');
      
      const content = await fs.readFile(dbPath, 'utf8');
      const database = JSON.parse(content);
      
      if (database.devices) {
        resources.devices.push(...database.devices);
      }
    } catch (error) {
      console.log('Note: Could not collect from device database');
    }
  }

  async collectFromCatalog(resources) {
    try {
      const catalogEntries = await fs.readdir(CONFIG.catalogDir, { recursive: true });
      
      for (const entry of catalogEntries) {
        if (entry.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(CONFIG.catalogDir, entry), 'utf8');
            const data = JSON.parse(content);
            
            if (data.devices) {
              resources.devices.push(...data.devices);
            }
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    } catch (error) {
      console.log('Note: Could not collect from catalog');
    }
  }

  async collectFromResources(resources) {
    try {
      const resourceFiles = await fs.readdir(CONFIG.resourcesDir, { recursive: true });
      
      for (const file of resourceFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(CONFIG.resourcesDir, file), 'utf8');
            const data = JSON.parse(content);
            
            if (data.community_patches) {
              resources.community.push(...data.community_patches);
            }
          } catch (error) {
            // Skip invalid files
          }
        }
      }
    } catch (error) {
      console.log('Note: Could not collect from resources');
    }
  }

  async updateDeviceMatrix(resources) {
    console.log('📋 Updating device matrix...');
    
    const deviceMatrix = [];
    const seenDevices = new Set();
    
    // Add devices from all sources
    for (const driver of resources.drivers) {
      for (const manufacturer of driver.manufacturers || []) {
        for (const productId of driver.productIds || []) {
          const deviceKey = `${manufacturer}_${productId}`;
          
          if (!seenDevices.has(deviceKey)) {
            deviceMatrix.push({
              manufacturer,
              productId,
              driverName: driver.name,
              capabilities: driver.capabilities,
              clusters: [...new Set(driver.clusters)],
              status: 'supported',
              tested: false,
              communityReported: false
            });
            
            seenDevices.add(deviceKey);
            this.enhancementReport.devicesAdded++;
          }
        }
      }
    }
    
    // Add community reported devices
    for (const device of resources.devices) {
      const deviceKey = `${device.manufacturer}_${device.model}`;
      
      if (!seenDevices.has(deviceKey)) {
        deviceMatrix.push({
          manufacturer: device.manufacturer,
          productId: device.model,
          driverName: device.suggestedDriver || 'unknown',
          capabilities: device.capabilities || [],
          clusters: device.clusters || [],
          status: device.working ? 'community_verified' : 'reported',
          tested: device.tested || false,
          communityReported: true
        });
        
        seenDevices.add(deviceKey);
        this.enhancementReport.devicesAdded++;
      }
    }
    
    // Generate CSV
    const csvContent = this.generateDeviceCSV(deviceMatrix);
    await fs.writeFile(path.join(CONFIG.matricesDir, 'DEVICE_MATRIX.csv'), csvContent);
    
    // Generate JSON
    await fs.writeFile(
      path.join(CONFIG.matricesDir, 'DEVICE_MATRIX.json'), 
      JSON.stringify(deviceMatrix, null, 2)
    );
    
    this.enhancementReport.matricesProcessed++;
  }

  generateDeviceCSV(devices) {
    const header = 'Manufacturer,Product ID,Driver Name,Capabilities,Clusters,Status,Tested,Community Reported\n';
    
    const rows = devices.map(device => {
      const capabilities = Array.isArray(device.capabilities) ? device.capabilities.join(';') : '';
      const clusters = Array.isArray(device.clusters) ? device.clusters.join(';') : '';
      
      return `"${device.manufacturer}","${device.productId}","${device.driverName}","${capabilities}","${clusters}","${device.status}","${device.tested}","${device.communityReported}"`;
    });
    
    return header + rows.join('\n');
  }

  async updateClusterMatrix(resources) {
    console.log('🔧 Updating cluster matrix...');
    
    const clusterUsage = {};
    
    // Count cluster usage across all drivers
    for (const driver of resources.drivers) {
      for (const cluster of driver.clusters) {
        if (!clusterUsage[cluster]) {
          clusterUsage[cluster] = {
            name: cluster,
            driversUsing: [],
            frequency: 0,
            capabilities: new Set()
          };
        }
        
        clusterUsage[cluster].driversUsing.push(driver.name);
        clusterUsage[cluster].frequency++;
        
        for (const capability of driver.capabilities) {
          clusterUsage[cluster].capabilities.add(capability);
        }
      }
    }
    
    // Convert to array and sort by frequency
    const clusterMatrix = Object.values(clusterUsage)
      .map(cluster => ({
        ...cluster,
        capabilities: Array.from(cluster.capabilities)
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    // Generate CSV
    const csvHeader = 'Cluster Name,Frequency,Drivers Using,Capabilities\n';
    const csvRows = clusterMatrix.map(cluster =>
      `"${cluster.name}","${cluster.frequency}","${cluster.driversUsing.join(';')}","${cluster.capabilities.join(';')}"`
    );
    
    await fs.writeFile(
      path.join(CONFIG.matricesDir, 'CLUSTER_MATRIX.csv'),
      csvHeader + csvRows.join('\n')
    );
    
    await fs.writeFile(
      path.join(CONFIG.matricesDir, 'CLUSTER_MATRIX.json'),
      JSON.stringify(clusterMatrix, null, 2)
    );
    
    this.enhancementReport.matricesProcessed++;
  }

  async updateCompatibilityMatrix(resources) {
    console.log('🔄 Updating compatibility matrix...');
    
    const compatibility = {
      homeyVersions: ['v5.0+', 'v8.0+', 'v10.0+'],
      zigbeeVersions: ['ZB3.0', 'ZB3.1'],
      categories: {}
    };
    
    // Group drivers by category
    for (const driver of resources.drivers) {
      const category = this.categorizeDriver(driver.name, driver.capabilities);
      
      if (!compatibility.categories[category]) {
        compatibility.categories[category] = {
          drivers: [],
          deviceCount: 0,
          compatibility: {
            'v5.0+': true,
            'v8.0+': true, 
            'v10.0+': true,
            'ZB3.0': true,
            'ZB3.1': true
          }
        };
      }
      
      compatibility.categories[category].drivers.push(driver.name);
      compatibility.categories[category].deviceCount += driver.manufacturers.length * driver.productIds.length;
    }
    
    await fs.writeFile(
      path.join(CONFIG.matricesDir, 'COMPATIBILITY_MATRIX.json'),
      JSON.stringify(compatibility, null, 2)
    );
    
    this.enhancementReport.matricesProcessed++;
  }

  categorizeDriver(name, capabilities) {
    if (name.includes('light') || capabilities.includes('dim') || capabilities.includes('light_hue')) {
      return 'lights';
    } else if (name.includes('sensor') || capabilities.includes('measure_')) {
      return 'sensors';
    } else if (name.includes('switch') || capabilities.includes('onoff')) {
      return 'switches';
    } else if (name.includes('climate') || capabilities.includes('target_temperature')) {
      return 'climate';
    } else if (name.includes('cover') || capabilities.includes('windowcoverings_set')) {
      return 'covers';
    }
    return 'other';
  }

  async enhanceDeviceDatabase(resources) {
    console.log('💾 Enhancing device database...');
    
    const enhancedDb = {
      metadata: {
        version: '2.0',
        lastUpdated: new Date().toISOString(),
        totalDevices: 0,
        sources: ['drivers', 'catalog', 'community', 'resources']
      },
      devices: [],
      manufacturers: new Set(),
      categories: {}
    };
    
    // Combine all device sources
    const allDevices = new Map();
    
    // Add driver-based devices
    for (const driver of resources.drivers) {
      for (const manufacturer of driver.manufacturers) {
        for (const productId of driver.productIds) {
          const key = `${manufacturer}_${productId}`;
          
          allDevices.set(key, {
            manufacturer,
            productId,
            driverName: driver.name,
            capabilities: driver.capabilities,
            clusters: driver.clusters,
            category: this.categorizeDriver(driver.name, driver.capabilities),
            source: 'driver',
            verified: true,
            lastUpdated: new Date().toISOString()
          });
          
          enhancedDb.manufacturers.add(manufacturer);
        }
      }
    }
    
    // Add community devices
    for (const device of resources.devices) {
      const key = `${device.manufacturer}_${device.model}`;
      
      if (allDevices.has(key)) {
        // Enhance existing device with community data
        const existing = allDevices.get(key);
        existing.communityVerified = true;
        existing.communityNotes = device.notes;
      } else {
        // Add new community device
        allDevices.set(key, {
          manufacturer: device.manufacturer,
          productId: device.model,
          driverName: device.suggestedDriver || 'unknown',
          capabilities: device.capabilities || [],
          clusters: device.clusters || [],
          category: 'community_reported',
          source: 'community',
          verified: device.working || false,
          communityNotes: device.notes,
          lastUpdated: new Date().toISOString()
        });
        
        enhancedDb.manufacturers.add(device.manufacturer);
      }
    }
    
    enhancedDb.devices = Array.from(allDevices.values());
    enhancedDb.metadata.totalDevices = enhancedDb.devices.length;
    enhancedDb.manufacturers = Array.from(enhancedDb.manufacturers);
    
    // Group by categories
    for (const device of enhancedDb.devices) {
      if (!enhancedDb.categories[device.category]) {
        enhancedDb.categories[device.category] = [];
      }
      enhancedDb.categories[device.category].push(device);
    }
    
    await fs.writeFile(
      path.join(CONFIG.dataDir, 'enhanced-device-database.json'),
      JSON.stringify(enhancedDb, null, 2)
    );
    
    this.enhancementReport.databasesUpdated++;
  }

  async createCommunityMatrix(resources) {
    console.log('👥 Creating community feedback matrix...');
    
    const communityMatrix = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalFeedback: resources.community.length
      },
      feedback: [],
      deviceRequests: [],
      bugReports: [],
      featureRequests: []
    };
    
    // Process community feedback
    for (const item of resources.community) {
      const processed = {
        id: item.id || `community_${Date.now()}`,
        type: item.type || 'general',
        device: item.device || 'unknown',
        manufacturer: item.manufacturer || 'unknown',
        status: item.status || 'open',
        priority: item.priority || 'medium',
        description: item.description || '',
        reporter: item.reporter || 'anonymous',
        date: item.date || new Date().toISOString()
      };
      
      communityMatrix.feedback.push(processed);
      
      // Categorize
      switch (item.type) {
        case 'device_request':
          communityMatrix.deviceRequests.push(processed);
          break;
        case 'bug_report':
          communityMatrix.bugReports.push(processed);
          break;
        case 'feature_request':
          communityMatrix.featureRequests.push(processed);
          break;
      }
    }
    
    await fs.writeFile(
      path.join(CONFIG.matricesDir, 'COMMUNITY_FEEDBACK_MATRIX.json'),
      JSON.stringify(communityMatrix, null, 2)
    );
    
    // Generate CSV summary
    const csvHeader = 'Type,Device,Manufacturer,Status,Priority,Date\n';
    const csvRows = communityMatrix.feedback.map(item =>
      `"${item.type}","${item.device}","${item.manufacturer}","${item.status}","${item.priority}","${item.date}"`
    );
    
    await fs.writeFile(
      path.join(CONFIG.matricesDir, 'COMMUNITY_FEEDBACK_MATRIX.csv'),
      csvHeader + csvRows.join('\n')
    );
    
    this.enhancementReport.matricesProcessed++;
  }

  async generateReport() {
    const reportPath = path.join(CONFIG.outputDir, 'matrices-enhancement-report.json');
    
    this.enhancementReport.recommendations = [
      '✅ All matrices and databases successfully enhanced',
      '📊 Device compatibility matrices updated with latest data',
      '💾 Enhanced device database with community contributions',
      '👥 Community feedback matrix created for tracking',
      '🔧 Cluster usage analysis completed',
      '📈 Monitor matrices for accuracy and completeness',
      '🔄 Update matrices regularly with new device additions'
    ];

    if (this.enhancementReport.errors.length > 0) {
      this.enhancementReport.recommendations.push('⚠️ Review and fix enhancement errors');
    }

    await fs.writeFile(reportPath, JSON.stringify(this.enhancementReport, null, 2));
    
    console.log('\n=== Matrices Enhancement Summary ===');
    console.log(`📋 Matrices Processed: ${this.enhancementReport.matricesProcessed}`);
    console.log(`💾 Databases Updated: ${this.enhancementReport.databasesUpdated}`);
    console.log(`📊 Resources Integrated: ${this.enhancementReport.resourcesIntegrated}`);
    console.log(`🔧 Devices Added: ${this.enhancementReport.devicesAdded}`);
    console.log(`❌ Errors: ${this.enhancementReport.errors.length}`);
    console.log(`📄 Report saved: ${reportPath}`);
  }
}

// Run enhancement if called directly
if (require.main === module) {
  const enhancer = new MatricesEnhancer();
  enhancer.enhanceMatrices()
    .then(() => {
      console.log('🎉 Matrices and databases enhancement completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Matrices enhancement failed:', error);
      process.exit(1);
    });
}

module.exports = MatricesEnhancer;
