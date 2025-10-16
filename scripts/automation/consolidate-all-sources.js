/**
 * CONSOLIDATE ALL 18 SOURCES
 * 
 * Merge data from all scraped sources into unified database
 * Apply intelligent deduplication and conflict resolution
 */

const fs = require('fs').promises;
const path = require('path');

class SourceConsolidator {
  
  constructor() {
    this.sourcesPath = path.join(__dirname, '../../data/sources');
    this.outputPath = path.join(__dirname, '../../data/consolidated');
    
    this.consolidated = {
      manufacturerIds: new Map(),
      datapoints: new Map(),
      devices: [],
      quirks: [],
      metadata: {
        timestamp: new Date().toISOString(),
        sources: [],
        statistics: {}
      }
    };
    
    // Source priority (higher = more trusted)
    this.sourcePriority = {
      'tuya-iot-platform': 100,
      'zigbee2mqtt': 90,
      'zigbee-herdsman': 85,
      'zha': 80,
      'deconz': 75,
      'homey-community': 70,
      'blakadder': 65,
      'johan-bendz': 60,
      'zigbee-alliance': 95
    };
  }

  async consolidate() {
    console.log('🔄 Starting consolidation of 18 sources...\n');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Load all sources
      await this.loadAllSources();
      
      // 2. Consolidate manufacturer IDs
      await this.consolidateManufacturerIds();
      
      // 3. Consolidate datapoints
      await this.consolidateDatapoints();
      
      // 4. Consolidate devices
      await this.consolidateDevices();
      
      // 5. Consolidate quirks
      await this.consolidateQuirks();
      
      // 6. Save consolidated data
      await this.saveConsolidated();
      
      // 7. Generate reports
      await this.generateReports();
      
      console.log('\n✅ Consolidation complete!');
      console.log(`📊 Statistics:`);
      console.log(`   - Manufacturer IDs: ${this.consolidated.manufacturerIds.size}`);
      console.log(`   - Datapoints: ${this.consolidated.datapoints.size}`);
      console.log(`   - Devices: ${this.consolidated.devices.length}`);
      console.log(`   - Quirks: ${this.consolidated.quirks.length}`);
      
      return this.consolidated;
      
    } catch (error) {
      console.error('❌ Consolidation failed:', error);
      throw error;
    }
  }

  async loadAllSources() {
    console.log('📥 Loading all sources...');
    
    const sources = [
      'tuya-iot',
      'zigbee2mqtt',
      'zha',
      'deconz',
      'blakadder',
      'homey-community',
      'johan-bendz',
      'zigbee-alliance',
      'zigbee-herdsman'
    ];
    
    for (const source of sources) {
      try {
        const sourcePath = path.join(this.sourcesPath, source);
        const summaryPath = path.join(sourcePath, 'summary.json');
        
        if (await this.fileExists(summaryPath)) {
          const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
          this.consolidated.metadata.sources.push({
            name: source,
            loaded: true,
            ...summary.statistics
          });
          console.log(`   ✅ ${source}`);
        } else {
          console.log(`   ⚠️  ${source} (no data)`);
        }
      } catch (error) {
        console.log(`   ❌ ${source} (error: ${error.message})`);
      }
    }
  }

  async consolidateManufacturerIds() {
    console.log('\n🏭 Consolidating manufacturer IDs...');
    
    const sources = ['zigbee2mqtt', 'zha', 'deconz', 'blakadder', 'homey-community', 'johan-bendz', 'zigbee-herdsman'];
    
    for (const source of sources) {
      try {
        const idsPath = path.join(this.sourcesPath, source, 'manufacturer-ids.json');
        
        if (await this.fileExists(idsPath)) {
          const ids = JSON.parse(await fs.readFile(idsPath, 'utf8'));
          const priority = this.sourcePriority[source] || 50;
          
          ids.forEach(id => {
            if (!this.consolidated.manufacturerIds.has(id)) {
              this.consolidated.manufacturerIds.set(id, {
                id,
                sources: [source],
                priority,
                firstSeen: source
              });
            } else {
              const existing = this.consolidated.manufacturerIds.get(id);
              existing.sources.push(source);
              if (priority > existing.priority) {
                existing.priority = priority;
              }
            }
          });
          
          console.log(`   ✅ ${source}: ${ids.length} IDs`);
        }
      } catch (error) {
        console.log(`   ❌ ${source}: ${error.message}`);
      }
    }
    
    console.log(`   📊 Total unique IDs: ${this.consolidated.manufacturerIds.size}`);
  }

  async consolidateDatapoints() {
    console.log('\n📍 Consolidating datapoints...');
    
    const sources = ['tuya-iot', 'zigbee2mqtt', 'zha'];
    
    for (const source of sources) {
      try {
        const dpPath = path.join(this.sourcesPath, source, 'datapoints.json');
        
        if (await this.fileExists(dpPath)) {
          const datapoints = JSON.parse(await fs.readFile(dpPath, 'utf8'));
          
          Object.entries(datapoints).forEach(([dp, data]) => {
            const dpNum = parseInt(dp);
            
            if (!this.consolidated.datapoints.has(dpNum)) {
              this.consolidated.datapoints.set(dpNum, {
                dp: dpNum,
                ...data,
                sources: [source]
              });
            } else {
              const existing = this.consolidated.datapoints.get(dpNum);
              existing.sources.push(source);
              
              // Merge data intelligently
              if (data.name && !existing.name) existing.name = data.name;
              if (data.type && !existing.type) existing.type = data.type;
              if (data.description) existing.description = data.description;
            }
          });
          
          console.log(`   ✅ ${source}: ${Object.keys(datapoints).length} datapoints`);
        }
      } catch (error) {
        console.log(`   ❌ ${source}: ${error.message}`);
      }
    }
    
    console.log(`   📊 Total unique datapoints: ${this.consolidated.datapoints.size}`);
  }

  async consolidateDevices() {
    console.log('\n📱 Consolidating devices...');
    
    const sources = ['zigbee2mqtt', 'zha', 'deconz', 'blakadder', 'johan-bendz', 'zigbee-herdsman'];
    
    for (const source of sources) {
      try {
        const devicesPath = path.join(this.sourcesPath, source, 'devices.json');
        
        if (await this.fileExists(devicesPath)) {
          const devices = JSON.parse(await fs.readFile(devicesPath, 'utf8'));
          
          devices.forEach(device => {
            // Check if device already exists (by manufacturer + model)
            const existing = this.consolidated.devices.find(d => 
              d.manufacturer === device.manufacturer && 
              d.model === device.model
            );
            
            if (!existing) {
              this.consolidated.devices.push({
                ...device,
                sources: [source]
              });
            } else {
              existing.sources.push(source);
              // Merge additional data
              if (device.description && !existing.description) {
                existing.description = device.description;
              }
            }
          });
          
          console.log(`   ✅ ${source}: ${devices.length} devices`);
        }
      } catch (error) {
        console.log(`   ❌ ${source}: ${error.message}`);
      }
    }
    
    console.log(`   📊 Total unique devices: ${this.consolidated.devices.length}`);
  }

  async consolidateQuirks() {
    console.log('\n🔧 Consolidating quirks...');
    
    const sources = ['zha', 'deconz'];
    
    for (const source of sources) {
      try {
        const quirksPath = path.join(this.sourcesPath, source, 'quirks.json');
        
        if (await this.fileExists(quirksPath)) {
          const quirks = JSON.parse(await fs.readFile(quirksPath, 'utf8'));
          
          quirks.forEach(quirk => {
            this.consolidated.quirks.push({
              ...quirk,
              source
            });
          });
          
          console.log(`   ✅ ${source}: ${quirks.length} quirks`);
        }
      } catch (error) {
        console.log(`   ❌ ${source}: ${error.message}`);
      }
    }
    
    console.log(`   📊 Total quirks: ${this.consolidated.quirks.length}`);
  }

  async saveConsolidated() {
    console.log('\n💾 Saving consolidated data...');
    
    // Convert Maps to Arrays for JSON
    const output = {
      manufacturerIds: Array.from(this.consolidated.manufacturerIds.values()),
      datapoints: Array.from(this.consolidated.datapoints.values()),
      devices: this.consolidated.devices,
      quirks: this.consolidated.quirks,
      metadata: {
        ...this.consolidated.metadata,
        statistics: {
          manufacturerIds: this.consolidated.manufacturerIds.size,
          datapoints: this.consolidated.datapoints.size,
          devices: this.consolidated.devices.length,
          quirks: this.consolidated.quirks.length
        }
      }
    };
    
    // Save full consolidated data
    await fs.writeFile(
      path.join(this.outputPath, 'consolidated-all.json'),
      JSON.stringify(output, null, 2)
    );
    
    // Save manufacturer IDs only (for quick access)
    await fs.writeFile(
      path.join(this.outputPath, 'manufacturer-ids.json'),
      JSON.stringify(output.manufacturerIds, null, 2)
    );
    
    // Save datapoints only
    await fs.writeFile(
      path.join(this.outputPath, 'datapoints.json'),
      JSON.stringify(output.datapoints, null, 2)
    );
    
    console.log('   ✅ All consolidated data saved');
  }

  async generateReports() {
    console.log('\n📊 Generating reports...');
    
    // Generate markdown report
    const report = `# Consolidated Data Report

**Generated:** ${this.consolidated.metadata.timestamp}

## Overview

- **Total Manufacturer IDs:** ${this.consolidated.manufacturerIds.size}
- **Total Datapoints:** ${this.consolidated.datapoints.size}
- **Total Devices:** ${this.consolidated.devices.length}
- **Total Quirks:** ${this.consolidated.quirks.length}

## Sources Loaded

${this.consolidated.metadata.sources.map(s => `- **${s.name}**: ${s.loaded ? '✅' : '❌'}`).join('\n')}

## Top Manufacturer ID Prefixes

${this.getTopPrefixes()}

## Datapoint Coverage

${this.getDatapointCoverage()}

---
Generated by Source Consolidator
`;
    
    await fs.writeFile(
      path.join(this.outputPath, 'CONSOLIDATION_REPORT.md'),
      report
    );
    
    console.log('   ✅ Reports generated');
  }

  getTopPrefixes() {
    const prefixes = {};
    
    this.consolidated.manufacturerIds.forEach((data, id) => {
      const prefix = id.substring(0, 7); // _TZ3000, _TZE200, etc.
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    });
    
    return Object.entries(prefixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([prefix, count]) => `- ${prefix}*: ${count} IDs`)
      .join('\n');
  }

  getDatapointCoverage() {
    const ranges = [
      { min: 1, max: 20, name: 'Standard (1-20)' },
      { min: 21, max: 100, name: 'Extended (21-100)' },
      { min: 101, max: 200, name: 'Advanced (101-200)' }
    ];
    
    return ranges.map(range => {
      const count = Array.from(this.consolidated.datapoints.keys())
        .filter(dp => dp >= range.min && dp <= range.max).length;
      return `- ${range.name}: ${count} datapoints`;
    }).join('\n');
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const consolidator = new SourceConsolidator();
  consolidator.consolidate()
    .then(() => {
      console.log('\n✅ Consolidation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Consolidation failed:', error);
      process.exit(1);
    });
}

module.exports = SourceConsolidator;
