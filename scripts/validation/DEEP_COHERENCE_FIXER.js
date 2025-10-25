#!/usr/bin/env node
/**
 * DEEP COHERENCE FIXER - Automatic Driver Corrections
 * Fixes: Cluster IDs, Capability naming, Categories, Flow cards
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '../../drivers');
const APP_JSON_PATH = path.join(__dirname, '../../app.json');
const REPORT_PATH = path.join(__dirname, '../../reports/DEEP_COHERENCE_REPORT.json');

// Cluster ID mappings
const CLUSTER_MAP = {
  'ON_OFF': 6,
  'LEVEL_CONTROL': 8,
  'COLOR_CONTROL': 768,
  'TEMPERATURE_MEASUREMENT': 1026,
  'RELATIVE_HUMIDITY': 1029,
  'ILLUMINANCE_MEASUREMENT': 1024,
  'POWER_CONFIGURATION': 1,
  'OCCUPANCY_SENSING': 1030,
  'IAS_ZONE': 1280,
  'THERMOSTAT': 513,
  'FAN_CONTROL': 514,
  'BASIC': 0,
  'IDENTIFY': 3,
  'SCENES': 5,
  'GROUPS': 4,
  'METERING': 1794,
  'ELECTRICAL_MEASUREMENT': 2820,
  'WINDOW_COVERING': 258
};

class DeepCoherenceFixer {
  constructor() {
    this.fixed = [];
    this.skipped = [];
    this.stats = {
      filesModified: 0,
      clusterFixed: 0,
      capabilityFixed: 0,
      categoryFixed: 0
    };
  }

  log(msg, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${msg}${colors.reset}`);
  }

  /**
   * Main fixer
   */
  async run() {
    this.log('\n🔧 DEEP COHERENCE FIXER - Starting...', 'info');
    this.log('='.repeat(80), 'info');

    // Load report
    if (!fs.existsSync(REPORT_PATH)) {
      this.log('❌ No report found. Run DEEP_COHERENCE_CHECKER first!', 'error');
      return;
    }

    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    
    // Fix all errors
    await this.fixClusterErrors(report.errors);
    await this.fixCapabilityNaming(report.errors);
    await this.fixCategoryMismatches(report.errors);
    
    // Generate summary
    this.generateSummary();
  }

  /**
   * Fix cluster ID errors
   */
  async fixClusterErrors(errors) {
    this.log('\n🔌 Fixing cluster errors...', 'info');
    
    const clusterErrors = errors.filter(e => e.type === 'CLUSTER_ERROR');
    
    for (const error of clusterErrors) {
      const devicePath = path.join(DRIVERS_PATH, error.driver, 'device.js');
      
      if (!fs.existsSync(devicePath)) {
        this.skipped.push({ driver: error.driver, reason: 'device.js not found' });
        continue;
      }

      let content = fs.readFileSync(devicePath, 'utf8');
      let modified = false;
      
      // Replace this.CLUSTER.XXX with numeric IDs
      Object.entries(CLUSTER_MAP).forEach(([name, id]) => {
        const regex = new RegExp(`this\\.CLUSTER\\.${name}`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, id.toString());
          modified = true;
          this.stats.clusterFixed++;
        }
      });
      
      if (modified) {
        fs.writeFileSync(devicePath, content, 'utf8');
        this.fixed.push({ driver: error.driver, type: 'CLUSTER_FIX' });
        this.stats.filesModified++;
      }
    }
    
    this.log(`✅ Fixed ${this.stats.clusterFixed} cluster references in ${this.stats.filesModified} files`, 'success');
  }

  /**
   * Fix capability naming (onoff.switch_X -> onoff.gangX)
   */
  async fixCapabilityNaming(errors) {
    this.log('\n📝 Fixing capability naming...', 'info');
    
    const namingErrors = errors.filter(e => e.type === 'OLD_CAPABILITY_NAMING');
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    let appModified = false;
    
    for (const error of namingErrors) {
      const driver = appJson.drivers.find(d => d.id === error.driver);
      if (!driver) continue;
      
      // Fix capabilities array
      if (driver.capabilities) {
        driver.capabilities = driver.capabilities.map(cap => {
          if (typeof cap === 'string' && cap.includes('.switch_')) {
            const match = cap.match(/onoff\.switch_(\d+)/);
            if (match) {
              this.stats.capabilityFixed++;
              return `onoff.gang${match[1]}`;
            }
          }
          return cap;
        });
        appModified = true;
      }
      
      // Fix capabilitiesOptions
      if (driver.capabilitiesOptions) {
        const newOptions = {};
        Object.entries(driver.capabilitiesOptions).forEach(([key, value]) => {
          if (key.includes('.switch_')) {
            const match = key.match(/onoff\.switch_(\d+)/);
            if (match) {
              newOptions[`onoff.gang${match[1]}`] = value;
              this.stats.capabilityFixed++;
            } else {
              newOptions[key] = value;
            }
          } else {
            newOptions[key] = value;
          }
        });
        driver.capabilitiesOptions = newOptions;
        appModified = true;
      }
    }
    
    if (appModified) {
      fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
      this.log(`✅ Fixed ${this.stats.capabilityFixed} capability names in app.json`, 'success');
    }
  }

  /**
   * Fix category mismatches (switches with dimmer capabilities)
   */
  async fixCategoryMismatches(errors) {
    this.log('\n🗂️  Fixing category mismatches...', 'info');
    
    const categoryErrors = errors.filter(e => e.type === 'CATEGORY_MISMATCH');
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    let appModified = false;
    
    for (const error of categoryErrors) {
      const driver = appJson.drivers.find(d => d.id === error.driver);
      if (!driver) continue;
      
      // Remove dimmer capabilities from switches
      if (driver.capabilities) {
        const dimCapabilities = ['dim', 'light_intensity', 'light_mode', 'light_saturation', 'light_hue'];
        const originalLength = driver.capabilities.length;
        
        driver.capabilities = driver.capabilities.filter(cap => {
          const capName = typeof cap === 'string' ? cap : cap;
          return !dimCapabilities.some(dim => capName === dim || capName.startsWith(dim + '.'));
        });
        
        if (driver.capabilities.length < originalLength) {
          this.stats.categoryFixed++;
          appModified = true;
          this.fixed.push({ 
            driver: error.driver, 
            type: 'REMOVED_DIM_CAPS',
            removed: originalLength - driver.capabilities.length
          });
        }
      }
    }
    
    if (appModified) {
      fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
      this.log(`✅ Fixed ${this.stats.categoryFixed} category mismatches`, 'success');
    }
  }

  /**
   * Generate summary
   */
  generateSummary() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('📊 DEEP COHERENCE FIXER - SUMMARY', 'info');
    this.log('='.repeat(80) + '\n', 'info');
    
    this.log('✅ Fixes Applied:', 'success');
    console.log(`   Files modified: ${this.stats.filesModified}`);
    console.log(`   Cluster IDs fixed: ${this.stats.clusterFixed}`);
    console.log(`   Capability names fixed: ${this.stats.capabilityFixed}`);
    console.log(`   Category issues fixed: ${this.stats.categoryFixed}`);
    
    if (this.skipped.length > 0) {
      this.log(`\n⚠️  Skipped ${this.skipped.length} items:`, 'warning');
      this.skipped.slice(0, 5).forEach(s => {
        console.log(`   ${s.driver}: ${s.reason}`);
      });
    }
    
    this.log('\n🎉 Fixes completed! Run homey app build to validate.', 'success');
    this.log('='.repeat(80) + '\n', 'info');
  }
}

// Run
if (require.main === module) {
  const fixer = new DeepCoherenceFixer();
  fixer.run().catch(console.error);
}

module.exports = DeepCoherenceFixer;
