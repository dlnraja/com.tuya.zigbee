#!/usr/bin/env node
/**
 * Driver Historical Enhancement Script
 * Enhances drivers with historical versions, community patches, and Johan Benz style improvements
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  driversDir: path.join(__dirname, '../drivers'),
  backupDriversDir: path.join(__dirname, '../backups/drivers'),
  improvedDriversDir: path.join(__dirname, '../improved-drivers'),
  generatedDriversDir: path.join(__dirname, '../generated-drivers'),
  outputDir: path.join(__dirname, '../drivers-enhancement-results'),
  catalogDir: path.join(__dirname, '../catalog'),
  templatesDir: path.join(__dirname, '../templates')
};

class DriverEnhancer {
  constructor() {
    this.enhancementReport = {
      timestamp: new Date().toISOString(),
      driversProcessed: 0,
      enhancementsApplied: 0,
      errors: [],
      recommendations: [],
      results: {}
    };
  }

  async enhanceAllDrivers() {
    console.log('🚀 Starting Driver Historical Enhancement...');
    
    try {
      await this.ensureDirectories();
      
      const currentDrivers = await this.scanDriverDirectories();
      const historicalDrivers = await this.loadHistoricalDrivers();
      const communityPatches = await this.loadCommunityPatches();
      
      for (const driverName of currentDrivers) {
        await this.enhanceDriver(driverName, historicalDrivers, communityPatches);
      }
      
      await this.generateEnhancementReport();
      console.log('✅ Driver Enhancement Complete!');
      
    } catch (error) {
      console.error('❌ Enhancement failed:', error);
      this.enhancementReport.errors.push(error.message);
    }
  }

  async ensureDirectories() {
    for (const dir of Object.values(CONFIG)) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
  }

  async scanDriverDirectories() {
    const drivers = [];
    
    try {
      const entries = await fs.readdir(CONFIG.driversDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_')) {
          drivers.push(entry.name);
        }
      }
    } catch (error) {
      console.log('Note: Current drivers directory not found');
    }
    
    return drivers;
  }

  async loadHistoricalDrivers() {
    const historical = {};
    
    try {
      const backupEntries = await fs.readdir(CONFIG.backupDriversDir, { withFileTypes: true });
      for (const entry of backupEntries) {
        if (entry.isDirectory()) {
          historical[entry.name] = await this.loadDriverData(
            path.join(CONFIG.backupDriversDir, entry.name)
          );
        }
      }
    } catch (error) {
      console.log('Note: Historical drivers not found');
    }
    
    return historical;
  }

  async loadDriverData(driverPath) {
    const data = { files: {} };
    
    try {
      const files = await fs.readdir(driverPath, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(driverPath, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const content = await fs.readFile(filePath, 'utf8');
            data.files[file] = {
              content,
              modified: stats.mtime
            };
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      console.log(`Note: Could not load driver data from ${driverPath}`);
    }
    
    return data;
  }

  async loadCommunityPatches() {
    const patches = [];
    
    try {
      // Load from data/enriched directory
      const enrichedPath = path.join(__dirname, '../data/enriched/enrichment_report.json');
      const enrichedData = await fs.readFile(enrichedPath, 'utf8');
      const enriched = JSON.parse(enrichedData);
      
      if (enriched.communityPatches) {
        patches.push(...enriched.communityPatches);
      }
    } catch (error) {
      console.log('Note: Community patches not found');
    }
    
    return patches;
  }

  async enhanceDriver(driverName, historicalDrivers, communityPatches) {
    console.log(`🔧 Enhancing driver: ${driverName}`);
    
    try {
      const currentPath = path.join(CONFIG.driversDir, driverName);
      const enhancement = {
        name: driverName,
        enhancements: [],
        warnings: [],
        success: false
      };
      
      // Load current driver
      const currentDriver = await this.loadDriverData(currentPath);
      
      // Apply historical improvements
      await this.applyHistoricalImprovements(currentPath, driverName, historicalDrivers, enhancement);
      
      // Apply community patches
      await this.applyCommunityPatches(currentPath, driverName, communityPatches, enhancement);
      
      // Apply Johan Benz style enhancements
      await this.applyJohanBenzStyle(currentPath, driverName, enhancement);
      
      // Validate and test driver
      await this.validateDriver(currentPath, enhancement);
      
      enhancement.success = enhancement.warnings.length === 0;
      this.enhancementReport.results[driverName] = enhancement;
      this.enhancementReport.driversProcessed++;
      
    } catch (error) {
      console.error(`❌ Failed to enhance ${driverName}:`, error);
      this.enhancementReport.errors.push(`${driverName}: ${error.message}`);
    }
  }

  async applyHistoricalImprovements(currentPath, driverName, historicalDrivers, enhancement) {
    // Check improved-drivers directory
    const improvedPath = path.join(CONFIG.improvedDriversDir, driverName);
    
    try {
      const improvedExists = await fs.access(improvedPath).then(() => true).catch(() => false);
      
      if (improvedExists) {
        // Copy improvements from improved-drivers
        await this.copyDriverImprovements(improvedPath, currentPath);
        enhancement.enhancements.push('Applied improved driver version');
        this.enhancementReport.enhancementsApplied++;
      }
    } catch (error) {
      enhancement.warnings.push(`Historical improvements: ${error.message}`);
    }
    
    // Check for historical patterns
    const relevantHistorical = Object.keys(historicalDrivers).filter(name => 
      name.includes(driverName) || driverName.includes(name)
    );
    
    if (relevantHistorical.length > 0) {
      enhancement.enhancements.push(`Found ${relevantHistorical.length} historical references`);
    }
  }

  async applyCommunityPatches(currentPath, driverName, communityPatches, enhancement) {
    let patchesApplied = 0;
    
    for (const patch of communityPatches) {
      try {
        if (this.isPatchApplicable(patch, driverName)) {
          await this.applyPatch(currentPath, patch);
          patchesApplied++;
        }
      } catch (error) {
        enhancement.warnings.push(`Patch error: ${error.message}`);
      }
    }
    
    if (patchesApplied > 0) {
      enhancement.enhancements.push(`Applied ${patchesApplied} community patches`);
      this.enhancementReport.enhancementsApplied += patchesApplied;
    }
  }

  async applyJohanBenzStyle(currentPath, driverName, enhancement) {
    try {
      // Ensure proper driver structure
      await this.ensureDriverStructure(currentPath);
      
      // Add missing assets
      await this.ensureDriverAssets(currentPath, driverName);
      
      // Enhance driver.compose.json
      await this.enhanceDriverCompose(currentPath, driverName);
      
      // Enhance device.js with best practices
      await this.enhanceDeviceJS(currentPath, driverName);
      
      enhancement.enhancements.push('Applied Johan Benz style architecture');
      this.enhancementReport.enhancementsApplied++;
      
    } catch (error) {
      enhancement.warnings.push(`Johan Benz style: ${error.message}`);
    }
  }

  async ensureDriverStructure(driverPath) {
    const requiredDirs = ['assets', 'assets/images'];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(driverPath, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async ensureDriverAssets(driverPath, driverName) {
    const assetsPath = path.join(driverPath, 'assets');
    const imagesPath = path.join(assetsPath, 'images');
    
    // Check if icon exists
    const iconFiles = ['icon.svg', 'large.png', 'small.png'];
    
    for (const iconFile of iconFiles) {
      const iconPath = path.join(imagesPath, iconFile);
      const exists = await fs.access(iconPath).then(() => true).catch(() => false);
      
      if (!exists) {
        // Copy from template or create placeholder
        await this.createPlaceholderIcon(iconPath, iconFile);
      }
    }
  }

  async createPlaceholderIcon(iconPath, iconFile) {
    try {
      const templatePath = path.join(CONFIG.templatesDir, 'assets', iconFile);
      const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
      
      if (templateExists) {
        await fs.copyFile(templatePath, iconPath);
      } else if (iconFile === 'icon.svg') {
        // Create basic SVG placeholder
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#4A90E2"/>
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="12">Tuya</text>
</svg>`;
        await fs.writeFile(iconPath, svgContent);
      }
    } catch (error) {
      console.log(`Note: Could not create placeholder icon ${iconFile}`);
    }
  }

  async enhanceDriverCompose(driverPath, driverName) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    try {
      let composeData = {};
      
      try {
        const content = await fs.readFile(composePath, 'utf8');
        composeData = JSON.parse(content);
      } catch (error) {
        // Create new compose file
      }
      
      // Enhanced driver.compose.json structure
      const enhanced = {
        name: {
          en: composeData.name?.en || `${driverName.replace(/_/g, ' ')} Driver`
        },
        class: composeData.class || "sensor",
        capabilities: composeData.capabilities || ["onoff"],
        capabilitiesOptions: composeData.capabilitiesOptions || {},
        zigbee: {
          manufacturerName: composeData.zigbee?.manufacturerName || ["_TZ3000_", "_TYZB01_", "_TZ3210_"],
          productId: composeData.zigbee?.productId || [driverName.toUpperCase()],
          endpoints: composeData.zigbee?.endpoints || {
            "1": {
              clusters: ["genBasic", "genIdentify", "genOnOff"]
            }
          },
          learnmode: composeData.zigbee?.learnmode || {
            image: `/drivers/${driverName}/assets/images/large.png`,
            instruction: {
              en: "Press and hold the reset button for 5 seconds until the LED blinks"
            }
          }
        },
        images: {
          large: `/drivers/${driverName}/assets/images/large.png`,
          small: `/drivers/${driverName}/assets/images/small.png`
        },
        ...composeData
      };
      
      await fs.writeFile(composePath, JSON.stringify(enhanced, null, 2));
      
    } catch (error) {
      throw new Error(`Driver compose enhancement failed: ${error.message}`);
    }
  }

  async enhanceDeviceJS(driverPath, driverName) {
    const devicePath = path.join(driverPath, 'device.js');
    
    try {
      let deviceContent = '';
      
      try {
        deviceContent = await fs.readFile(devicePath, 'utf8');
      } catch (error) {
        // Create new device.js file
      }
      
      if (!deviceContent || deviceContent.length < 100) {
        // Create enhanced device.js with Johan Benz style
        const enhancedDevice = this.generateEnhancedDeviceJS(driverName);
        await fs.writeFile(devicePath, enhancedDevice);
      }
      
    } catch (error) {
      throw new Error(`Device.js enhancement failed: ${error.message}`);
    }
  }

  generateEnhancedDeviceJS(driverName) {
    return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${driverName.replace(/_/g, '')}Device extends ZigBeeDevice {

  async onNodeInit() {
    this.printNode();
    
    // Register capabilities
    await this.registerCapabilities();
    
    // Register attribute listeners
    await this.registerAttributeListeners();
    
    // Apply community patches
    await this.applyCommunityPatches();
  }

  async registerCapabilities() {
    // Register standard capabilities
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff');
    }
    
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl');
    }
    
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 3600,
            minChange: 1,
          },
        },
      });
    }
  }

  async registerAttributeListeners() {
    // Listen for attribute changes
    this.zclNode.endpoints[1].clusters.genOnOff?.on('attr.onOff', (value) => {
      this.setCapabilityValue('onoff', value === 1);
    });
    
    this.zclNode.endpoints[1].clusters.genPowerCfg?.on('attr.batteryPercentageRemaining', (value) => {
      const batteryThreshold = this.getSetting('batteryThreshold') || 20;
      const percentage = Math.round(value / 2);
      
      this.setCapabilityValue('measure_battery', percentage);
      
      // Low battery warning
      if (percentage <= batteryThreshold) {
        this.homey.notifications.createNotification({
          excerpt: \`Low battery warning for \${this.getName()}: \${percentage}%\`
        });
      }
    });
  }

  async applyCommunityPatches() {
    // Apply battery fix for specific devices
    const batteryFix = this.getSetting('batteryFix');
    if (batteryFix) {
      this.log('Applying battery fix patch');
      // Additional battery reporting configuration
    }
    
    // Apply other community patches as needed
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    if (changedKeys.includes('batteryThreshold')) {
      this.log('Battery threshold changed to:', newSettings.batteryThreshold);
    }
    
    return Promise.resolve(true);
  }

}

module.exports = ${driverName.replace(/_/g, '')}Device;
`;
  }

  isPatchApplicable(patch, driverName) {
    if (!patch || !patch.targetDrivers) return false;
    
    return patch.targetDrivers.some(target => 
      driverName.includes(target) || target.includes(driverName)
    );
  }

  async applyPatch(driverPath, patch) {
    // Apply specific patches based on patch type
    if (patch.type === 'battery_fix') {
      await this.applyBatteryPatch(driverPath, patch);
    } else if (patch.type === 'capability_enhancement') {
      await this.applyCapabilityPatch(driverPath, patch);
    }
  }

  async applyBatteryPatch(driverPath, patch) {
    // Apply battery reporting fixes
    const devicePath = path.join(driverPath, 'device.js');
    
    try {
      let content = await fs.readFile(devicePath, 'utf8');
      
      // Add battery fix if not present
      if (!content.includes('batteryFix') && patch.code) {
        content = content.replace(
          'async applyCommunityPatches() {',
          `async applyCommunityPatches() {
    ${patch.code}
`
        );
        
        await fs.writeFile(devicePath, content);
      }
    } catch (error) {
      throw new Error(`Battery patch failed: ${error.message}`);
    }
  }

  async copyDriverImprovements(sourcePath, targetPath) {
    try {
      const files = await fs.readdir(sourcePath, { recursive: true });
      
      for (const file of files) {
        const sourceFile = path.join(sourcePath, file);
        const targetFile = path.join(targetPath, file);
        
        try {
          const stats = await fs.stat(sourceFile);
          if (stats.isFile()) {
            await fs.mkdir(path.dirname(targetFile), { recursive: true });
            await fs.copyFile(sourceFile, targetFile);
          }
        } catch (error) {
          // Skip files that can't be copied
        }
      }
    } catch (error) {
      throw new Error(`Copy improvements failed: ${error.message}`);
    }
  }

  async validateDriver(driverPath, enhancement) {
    try {
      // Check required files
      const requiredFiles = ['device.js', 'driver.compose.json'];
      
      for (const file of requiredFiles) {
        const filePath = path.join(driverPath, file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        
        if (!exists) {
          enhancement.warnings.push(`Missing required file: ${file}`);
        }
      }
      
      // Validate driver.compose.json structure
      const composePath = path.join(driverPath, 'driver.compose.json');
      try {
        const content = await fs.readFile(composePath, 'utf8');
        const compose = JSON.parse(content);
        
        if (!compose.name || !compose.class) {
          enhancement.warnings.push('Invalid driver.compose.json structure');
        }
      } catch (error) {
        enhancement.warnings.push(`driver.compose.json validation failed: ${error.message}`);
      }
      
    } catch (error) {
      enhancement.warnings.push(`Validation failed: ${error.message}`);
    }
  }

  async generateEnhancementReport() {
    const reportPath = path.join(CONFIG.outputDir, 'drivers-enhancement-report.json');
    
    // Calculate statistics
    const successfulEnhancements = Object.values(this.enhancementReport.results)
      .filter(result => result.success).length;
    
    const totalWarnings = Object.values(this.enhancementReport.results)
      .reduce((sum, result) => sum + result.warnings.length, 0);
    
    // Add summary and recommendations
    this.enhancementReport.summary = {
      totalDrivers: this.enhancementReport.driversProcessed,
      successfulEnhancements,
      totalEnhancements: this.enhancementReport.enhancementsApplied,
      totalWarnings,
      successRate: this.enhancementReport.driversProcessed > 0 
        ? Math.round((successfulEnhancements / this.enhancementReport.driversProcessed) * 100) 
        : 0
    };
    
    if (this.enhancementReport.enhancementsApplied > 0) {
      this.enhancementReport.recommendations.push('✅ Driver enhancements successfully applied');
    }
    
    if (totalWarnings > 0) {
      this.enhancementReport.recommendations.push('⚠️ Review warnings and fix validation issues');
    }
    
    this.enhancementReport.recommendations.push('🔄 Run validation tests on enhanced drivers');
    this.enhancementReport.recommendations.push('📊 Update driver compatibility matrices');
    
    await fs.writeFile(reportPath, JSON.stringify(this.enhancementReport, null, 2));
    
    console.log('\\n=== Driver Enhancement Summary ===');
    console.log(`📊 Drivers Processed: ${this.enhancementReport.summary.totalDrivers}`);
    console.log(`✅ Successful Enhancements: ${successfulEnhancements}`);
    console.log(`🔧 Total Enhancements Applied: ${this.enhancementReport.enhancementsApplied}`);
    console.log(`⚠️  Warnings: ${totalWarnings}`);
    console.log(`📈 Success Rate: ${this.enhancementReport.summary.successRate}%`);
    console.log(`📄 Report saved: ${reportPath}`);
  }
}

// Run enhancement if called directly
if (require.main === module) {
  const enhancer = new DriverEnhancer();
  enhancer.enhanceAllDrivers()
    .then(() => {
      console.log('🎉 Driver enhancement completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Driver enhancement failed:', error);
      process.exit(1);
    });
}

module.exports = DriverEnhancer;
