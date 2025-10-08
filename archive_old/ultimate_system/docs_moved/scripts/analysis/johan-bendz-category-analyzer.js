#!/usr/bin/env node

/**
 * JOHAN BENDZ CATEGORY ANALYZER
 * Analyzes current drivers against Johan Bendz device categories
 * Identifies missing drivers and categories for complete coverage
 */

const fs = require('fs');
const path = require('path');

class JohanBenzCategoryAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.currentDrivers = new Map();
    this.missingDrivers = [];
    this.missingCategories = [];
    
    // Johan Bendz complete device categories
    this.johanBenzCategories = {
      // LIGHTING SYSTEMS
      'Smart Lighting': [
        'smart_bulb', 'rgb_bulb', 'tunable_white_bulb', 'candle_bulb', 'filament_bulb', 'gu10_spot',
        'led_strip', 'led_controller', 'dimmer_switch', 'rotary_dimmer'
      ],
      
      // SWITCHES & CONTROLS  
      'Wall Switches': [
        'wall_switch_1gang', 'wall_switch_2gang', 'wall_switch_3gang', 'wall_switch_4gang',
        'touch_switch', 'scene_switch'
      ],
      
      // SENSORS & DETECTION
      'Motion & Presence': [
        'motion_sensor', 'pir_sensor', 'radar_sensor', 'presence_sensor'
      ],
      
      'Environmental Sensors': [
        'temperature_humidity_sensor', 'air_quality_monitor', 'soil_moisture_sensor'
      ],
      
      'Contact & Security': [
        'contact_sensor', 'door_window_sensor', 'vibration_sensor'
      ],
      
      'Safety Detection': [
        'smoke_detector', 'co_detector', 'gas_detector', 'water_leak_sensor'
      ],
      
      // CLIMATE CONTROL
      'Climate Systems': [
        'thermostat', 'temperature_controller', 'hvac_controller', 'radiator_valve'
      ],
      
      // COVERS & MOTORS
      'Window Coverings': [
        'blind_controller', 'curtain_motor', 'roller_blind', 'shade_controller', 'window_motor'
      ],
      
      // ACCESS CONTROL
      'Locks & Access': [
        'smart_lock', 'door_lock', 'keypad_lock', 'fingerprint_lock', 'door_controller', 'garage_door'
      ],
      
      // POWER & ENERGY
      'Power Management': [
        'smart_plug', 'smart_outlet', 'energy_plug', 'wall_outlet', 'usb_outlet', 'extension_plug'
      ],
      
      // AUTOMATION & CONTROL
      'Scene Control': [
        'wireless_button', 'scene_switch', 'panic_button', 'emergency_button', 'sos_button'
      ],
      
      // FANS & VENTILATION
      'Fan Control': [
        'fan_controller'
      ],
      
      // MULTI-SENSORS
      'Multi-Function': [
        'multisensor'
      ]
    };
    
    // Additional Johan Bendz specific devices that might be missing
    this.johanBenzSpecificDevices = [
      // Specific IKEA devices
      'ikea_tradfri_bulb', 'ikea_styrbar_remote', 'ikea_symfonisk_remote',
      
      // Aqara specific devices  
      'aqara_cube', 'aqara_button', 'aqara_motion_sensor', 'aqara_temperature_sensor',
      
      // Philips Hue devices
      'hue_bulb', 'hue_dimmer', 'hue_motion_sensor',
      
      // Sonoff devices
      'sonoff_basic', 'sonoff_mini', 'sonoff_zbbridge',
      
      // Xiaomi devices
      'xiaomi_button', 'xiaomi_door_sensor', 'xiaomi_motion_sensor',
      
      // Advanced sensors
      'lux_sensor', 'noise_sensor', 'pressure_sensor', 'formaldehyde_sensor',
      
      // Smart home hubs
      'zigbee_coordinator', 'repeater_node',
      
      // Irrigation and garden
      'sprinkler_controller', 'garden_sensor',
      
      // Pet and lifestyle
      'pet_feeder', 'air_purifier_controller',
      
      // Advanced lighting
      'neon_strip', 'under_cabinet_light', 'outdoor_light',
      
      // Industrial sensors
      'level_sensor', 'flow_sensor', 'current_sensor'
    ];
  }

  log(message, type = 'info') {
    const prefix = { 'info': '🔍', 'success': '✅', 'error': '❌', 'warning': '⚠️', 'category': '📁' }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  scanCurrentDrivers() {
    this.log('Scanning current drivers...', 'info');
    
    const driversPath = path.join(this.projectRoot, 'drivers');
    if (fs.existsSync(driversPath)) {
      const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          try {
            const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            this.currentDrivers.set(driver, {
              name: composeData.name?.en || driver,
              class: composeData.class || 'unknown',
              capabilities: composeData.capabilities || [],
              category: this.categorizeDriver(driver)
            });
          } catch (error) {
            this.log(`Error reading ${driver}: ${error.message}`, 'warning');
          }
        }
      }
      
      this.log(`Found ${this.currentDrivers.size} current drivers`, 'success');
    }
  }

  categorizeDriver(driverName) {
    for (const [category, drivers] of Object.entries(this.johanBenzCategories)) {
      if (drivers.includes(driverName)) {
        return category;
      }
    }
    return 'Uncategorized';
  }

  analyzeCategories() {
    this.log('Analyzing category coverage...', 'info');
    
    const currentDriverNames = Array.from(this.currentDrivers.keys());
    
    // Check each Johan Bendz category
    for (const [category, expectedDrivers] of Object.entries(this.johanBenzCategories)) {
      const missingInCategory = expectedDrivers.filter(driver => !currentDriverNames.includes(driver));
      
      if (missingInCategory.length > 0) {
        this.log(`Category "${category}" missing ${missingInCategory.length} drivers:`, 'category');
        missingInCategory.forEach(driver => {
          this.log(`  - ${driver}`, 'warning');
          this.missingDrivers.push({
            name: driver,
            category: category,
            priority: this.getDriverPriority(driver, category)
          });
        });
      } else {
        this.log(`Category "${category}" complete ✅`, 'success');
      }
    }
    
    // Check Johan Bendz specific devices
    const missingSpecific = this.johanBenzSpecificDevices.filter(device => !currentDriverNames.includes(device));
    if (missingSpecific.length > 0) {
      this.log(`Johan Bendz specific devices missing ${missingSpecific.length}:`, 'category');
      missingSpecific.forEach(device => {
        this.log(`  - ${device}`, 'warning');
        this.missingDrivers.push({
          name: device,
          category: 'Johan Bendz Specific',
          priority: 'medium'
        });
      });
    }
  }

  getDriverPriority(driverName, category) {
    const highPriorityCategories = ['Smart Lighting', 'Motion & Presence', 'Power Management', 'Climate Systems'];
    const highPriorityDevices = ['smart_bulb', 'motion_sensor', 'smart_plug', 'thermostat', 'contact_sensor'];
    
    if (highPriorityCategories.includes(category) || highPriorityDevices.includes(driverName)) {
      return 'high';
    } else if (category === 'Johan Bendz Specific') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  generateMissingDrivers() {
    this.log('Generating missing driver specifications...', 'info');
    
    const highPriorityMissing = this.missingDrivers.filter(d => d.priority === 'high');
    const mediumPriorityMissing = this.missingDrivers.filter(d => d.priority === 'medium');
    
    this.log(`High priority missing: ${highPriorityMissing.length}`, 'warning');
    this.log(`Medium priority missing: ${mediumPriorityMissing.length}`, 'warning');
    
    return {
      high: highPriorityMissing,
      medium: mediumPriorityMissing,
      low: this.missingDrivers.filter(d => d.priority === 'low')
    };
  }

  generateReport() {
    this.log('Generating comprehensive analysis report...', 'info');
    
    const currentCategories = {};
    for (const [driver, data] of this.currentDrivers) {
      if (!currentCategories[data.category]) {
        currentCategories[data.category] = [];
      }
      currentCategories[data.category].push(driver);
    }

    const missingByPriority = this.generateMissingDrivers();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCurrentDrivers: this.currentDrivers.size,
        totalMissingDrivers: this.missingDrivers.length,
        categoriesCovered: Object.keys(currentCategories).length,
        johanBenzCategories: Object.keys(this.johanBenzCategories).length
      },
      currentCategories,
      missingDrivers: {
        byPriority: missingByPriority,
        all: this.missingDrivers
      },
      recommendations: this.generateRecommendations(missingByPriority)
    };

    // Save report
    const reportsDir = path.join(this.projectRoot, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, 'johan-bendz-category-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Report saved to: ${reportPath}`, 'success');
    return report;
  }

  generateRecommendations(missingByPriority) {
    const recommendations = [];
    
    if (missingByPriority.high.length > 0) {
      recommendations.push({
        priority: 'immediate',
        action: 'Create high priority drivers',
        drivers: missingByPriority.high.map(d => d.name),
        reason: 'Essential for complete Johan Bendz category coverage'
      });
    }
    
    if (missingByPriority.medium.length > 0) {
      recommendations.push({
        priority: 'next_phase',
        action: 'Add Johan Bendz specific devices',
        drivers: missingByPriority.medium.slice(0, 10).map(d => d.name),
        reason: 'Enhance compatibility with Johan Bendz ecosystem'
      });
    }
    
    return recommendations;
  }

  async run() {
    this.log('🚀 JOHAN BENDZ CATEGORY ANALYSIS STARTING', 'info');
    this.log('Comprehensive driver and category coverage analysis', 'info');
    this.log('=' * 80, 'info');
    
    this.scanCurrentDrivers();
    this.analyzeCategories();
    const report = this.generateReport();
    
    this.log('\n📊 ANALYSIS COMPLETE', 'success');
    this.log(`Total drivers: ${report.summary.totalCurrentDrivers}`, 'info');
    this.log(`Missing drivers: ${report.summary.totalMissingDrivers}`, 'warning');
    this.log(`Categories covered: ${report.summary.categoriesCovered}/${report.summary.johanBenzCategories}`, 'info');
    
    if (report.missingDrivers.byPriority.high.length > 0) {
      this.log(`\n🚨 HIGH PRIORITY MISSING (${report.missingDrivers.byPriority.high.length}):`, 'warning');
      report.missingDrivers.byPriority.high.forEach(d => {
        this.log(`  - ${d.name} (${d.category})`, 'warning');
      });
    }
    
    return report;
  }
}

// Execute if run directly
if (require.main === module) {
  const analyzer = new JohanBenzCategoryAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = JohanBenzCategoryAnalyzer;
