/**
 * APPLY MANUFACTURER IDs TO DRIVERS
 * 
 * Automatically apply manufacturer IDs from consolidated sources
 * to all existing drivers based on intelligent matching
 */

const fs = require('fs').promises;
const path = require('path');

class ManufacturerIdApplicator {
  
  constructor() {
    this.driversPath = path.join(__dirname, '../../drivers');
    this.consolidatedPath = path.join(__dirname, '../../data/consolidated/manufacturer-ids.json');
    this.statistics = {
      driversScanned: 0,
      driversUpdated: 0,
      idsAdded: 0,
      idsByCategory: {}
    };
  }

  async apply() {
    console.log('🔄 Applying manufacturer IDs to drivers...\n');
    
    try {
      // 1. Load consolidated manufacturer IDs
      const manufacturerIds = await this.loadManufacturerIds();
      console.log(`📥 Loaded ${manufacturerIds.length} manufacturer IDs\n`);
      
      // 2. Scan all drivers
      const drivers = await this.scanDrivers();
      console.log(`📂 Found ${drivers.length} drivers\n`);
      
      // 3. Apply IDs to each driver
      for (const driver of drivers) {
        await this.applyToDriver(driver, manufacturerIds);
      }
      
      // 4. Generate report
      await this.generateReport();
      
      console.log('\n✅ Application complete!');
      console.log(`📊 Statistics:`);
      console.log(`   - Drivers scanned: ${this.statistics.driversScanned}`);
      console.log(`   - Drivers updated: ${this.statistics.driversUpdated}`);
      console.log(`   - IDs added: ${this.statistics.idsAdded}`);
      
      return this.statistics;
      
    } catch (error) {
      console.error('❌ Application failed:', error);
      throw error;
    }
  }

  async loadManufacturerIds() {
    const data = await fs.readFile(this.consolidatedPath, 'utf8');
    return JSON.parse(data);
  }

  async scanDrivers() {
    const drivers = [];
    const entries = await fs.readdir(this.driversPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const driverPath = path.join(this.driversPath, entry.name);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        try {
          await fs.access(composePath);
          drivers.push({
            id: entry.name,
            path: driverPath,
            composePath
          });
        } catch {
          // No driver.compose.json
        }
      }
    }
    
    return drivers;
  }

  async applyToDriver(driver, allManufacturerIds) {
    this.statistics.driversScanned++;
    
    try {
      // Read current driver.compose.json
      const composeData = await fs.readFile(driver.composePath, 'utf8');
      const compose = JSON.parse(composeData);
      
      if (!compose.zigbee || !compose.zigbee.manufacturerName) {
        console.log(`⚠️  ${driver.id}: No manufacturerName field`);
        return;
      }
      
      const currentIds = Array.isArray(compose.zigbee.manufacturerName) 
        ? compose.zigbee.manufacturerName 
        : [compose.zigbee.manufacturerName];
      
      // Determine driver category
      const category = this.categorizeDriver(driver.id);
      
      // Find matching IDs for this category
      const matchingIds = this.findMatchingIds(category, allManufacturerIds);
      
      // Merge with existing IDs
      const newIds = [...new Set([...currentIds, ...matchingIds])];
      
      if (newIds.length > currentIds.length) {
        const addedCount = newIds.length - currentIds.length;
        
        // Update driver
        compose.zigbee.manufacturerName = newIds;
        
        // Save updated driver
        await fs.writeFile(
          driver.composePath,
          JSON.stringify(compose, null, 2)
        );
        
        this.statistics.driversUpdated++;
        this.statistics.idsAdded += addedCount;
        this.statistics.idsByCategory[category] = (this.statistics.idsByCategory[category] || 0) + addedCount;
        
        console.log(`✅ ${driver.id}: Added ${addedCount} IDs (${currentIds.length} → ${newIds.length})`);
      } else {
        console.log(`   ${driver.id}: No new IDs`);
      }
      
    } catch (error) {
      console.error(`❌ ${driver.id}: ${error.message}`);
    }
  }

  categorizeDriver(driverId) {
    // Categorize based on driver ID patterns
    const categories = {
      'motion': ['motion', 'pir', 'presence', 'occupancy', 'radar', 'mmwave'],
      'contact': ['contact', 'door', 'window', 'magnet'],
      'temperature': ['temp', 'humid', 'climate', 'thermostat', 'trv'],
      'smoke': ['smoke', 'fire', 'gas', 'co'],
      'water': ['water', 'leak', 'flood'],
      'switch': ['switch', 'relay'],
      'dimmer': ['dimmer'],
      'plug': ['plug', 'socket', 'outlet'],
      'light': ['bulb', 'light', 'led', 'rgb', 'strip'],
      'curtain': ['curtain', 'blind', 'shade', 'cover'],
      'button': ['button', 'remote', 'scene', 'controller'],
      'siren': ['siren', 'alarm', 'horn'],
      'valve': ['valve', 'irrigation']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => driverId.includes(keyword))) {
        return category;
      }
    }
    
    return 'unknown';
  }

  findMatchingIds(category, allManufacturerIds) {
    // Filter IDs based on device type indicators in manufacturer ID
    const categoryPatterns = {
      'motion': ['pir', 'motion', 'presence', 'occupancy'],
      'contact': ['door', 'window', 'magnet', 'contact'],
      'temperature': ['temp', 'humid', 'climate', 'th'],
      'smoke': ['smoke', 'fire', 'gas', 'co'],
      'water': ['water', 'leak'],
      'switch': ['switch', 'relay'],
      'plug': ['plug', 'socket'],
      'light': ['light', 'bulb', 'led'],
      'curtain': ['curtain', 'blind'],
      'button': ['button', 'remote', 'scene'],
      'siren': ['siren', 'alarm'],
      'valve': ['valve']
    };
    
    const patterns = categoryPatterns[category] || [];
    const matching = [];
    
    // Get high-priority IDs from trusted sources
    allManufacturerIds
      .filter(idData => idData.priority >= 80) // Only trusted sources
      .forEach(idData => {
        const id = idData.id.toLowerCase();
        
        // Check if ID matches category patterns
        if (patterns.some(pattern => id.includes(pattern))) {
          matching.push(idData.id);
        }
      });
    
    // Limit to avoid overwhelming drivers
    return matching.slice(0, 20);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: this.statistics
    };
    
    const reportPath = path.join(__dirname, '../../data/consolidated/application-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Run if called directly
if (require.main === module) {
  const applicator = new ManufacturerIdApplicator();
  applicator.apply()
    .then(() => {
      console.log('\n✅ Application complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Application failed:', error);
      process.exit(1);
    });
}

module.exports = ManufacturerIdApplicator;
