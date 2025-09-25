#!/usr/bin/env node

/**
 * APPLY GIT ENRICHMENTS
 * Enriches current drivers with missing data from git history scan
 */

const fs = require('fs');
const path = require('path');

class GitEnrichmentApplier {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportPath = path.join(this.projectRoot, 'reports/git-driver-scan-report.json');
    this.appliedEnrichments = 0;
  }

  log(message, type = 'info') {
    const prefix = { 'info': '🔄', 'success': '✅', 'error': '❌', 'warning': '⚠️' }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  loadScanReport() {
    if (!fs.existsSync(this.reportPath)) {
      throw new Error('Git scan report not found. Run scan-git-drivers.js first.');
    }
    
    return JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
  }

  async applyEnrichments() {
    this.log('Loading git scan report...', 'info');
    const report = this.loadScanReport();
    
    this.log(`Found ${report.missingEnrichments.length} drivers to enrich`, 'info');
    
    for (const enrichment of report.missingEnrichments) {
      await this.enrichDriver(enrichment);
    }
    
    this.log(`Applied enrichments to ${this.appliedEnrichments} drivers`, 'success');
  }

  async enrichDriver(enrichment) {
    const driverPath = path.join(this.projectRoot, 'drivers', enrichment.driver, 'driver.compose.json');
    
    if (!fs.existsSync(driverPath)) {
      this.log(`Driver not found: ${enrichment.driver}`, 'warning');
      return;
    }

    try {
      const currentData = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
      let modified = false;

      // Apply manufacturer name enrichments
      const manufacturerSuggestion = enrichment.suggestions.find(s => s.type === 'manufacturerName');
      if (manufacturerSuggestion) {
        if (!currentData.zigbee) currentData.zigbee = {};
        if (!currentData.zigbee.manufacturerName) currentData.zigbee.manufacturerName = [];
        
        const currentManufacturers = new Set(currentData.zigbee.manufacturerName);
        manufacturerSuggestion.values.forEach(mfg => {
          if (!currentManufacturers.has(mfg)) {
            currentData.zigbee.manufacturerName.push(mfg);
            modified = true;
          }
        });
      }

      // Apply product ID enrichments
      const productSuggestion = enrichment.suggestions.find(s => s.type === 'productId');
      if (productSuggestion) {
        if (!currentData.zigbee) currentData.zigbee = {};
        if (!currentData.zigbee.productId) currentData.zigbee.productId = [];
        
        const currentProducts = new Set(currentData.zigbee.productId);
        productSuggestion.values.forEach(pid => {
          if (!currentProducts.has(pid)) {
            currentData.zigbee.productId.push(pid);
            modified = true;
          }
        });
      }

      // Apply capability enrichments (carefully)
      const capabilitySuggestion = enrichment.suggestions.find(s => s.type === 'capabilities');
      if (capabilitySuggestion) {
        if (!currentData.capabilities) currentData.capabilities = [];
        
        const currentCaps = new Set(currentData.capabilities);
        const relevantCaps = this.getRelevantCapabilities(enrichment.driver, capabilitySuggestion.values);
        
        relevantCaps.forEach(cap => {
          if (!currentCaps.has(cap)) {
            currentData.capabilities.push(cap);
            modified = true;
          }
        });
      }

      // Apply old endpoints if missing
      if (enrichment.oldData.zigbee?.endpoints && !currentData.zigbee?.endpoints) {
        currentData.zigbee.endpoints = enrichment.oldData.zigbee.endpoints;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(driverPath, JSON.stringify(currentData, null, 2));
        this.log(`Enriched ${enrichment.driver}`, 'success');
        this.appliedEnrichments++;
      }

    } catch (error) {
      this.log(`Error enriching ${enrichment.driver}: ${error.message}`, 'error');
    }
  }

  getRelevantCapabilities(driverName, suggestedCaps) {
    // Filter capabilities based on driver type
    const deviceTypeCapabilities = {
      'thermostat': ['target_temperature', 'measure_temperature', 'thermostat_mode'],
      'curtain_motor': ['windowcoverings_state', 'dim'],
      'smart_lock': ['locked', 'alarm_generic'],
      'motion_sensor': ['alarm_motion', 'measure_luminance'],
      'radiator_valve': ['target_temperature', 'measure_temperature'],
      'smart_bulb': ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'],
      'smart_plug': ['onoff', 'measure_power', 'meter_power'],
      'multisensor': ['measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact'],
      'wall_switch_1gang': ['onoff'],
      'emergency_button': ['alarm_generic'],
      'water_leak_sensor': ['alarm_water']
    };

    const allowedCaps = deviceTypeCapabilities[driverName] || [];
    const batteryDevices = ['thermostat', 'motion_sensor', 'radiator_valve', 'multisensor', 'water_leak_sensor'];
    
    if (batteryDevices.includes(driverName)) {
      allowedCaps.push('measure_battery');
    }

    return suggestedCaps.filter(cap => 
      allowedCaps.includes(cap) || 
      cap === 'measure_battery'
    );
  }

  async run() {
    this.log('🚀 APPLYING GIT ENRICHMENTS', 'info');
    
    await this.applyEnrichments();
    
    this.log('\n📊 ENRICHMENT COMPLETE', 'success');
    this.log(`Total enrichments applied: ${this.appliedEnrichments}`, 'info');
  }
}

// Execute if run directly
if (require.main === module) {
  const applier = new GitEnrichmentApplier();
  applier.run().catch(console.error);
}

module.exports = GitEnrichmentApplier;
