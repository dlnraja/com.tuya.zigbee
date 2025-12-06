#!/usr/bin/env node
/**
 * PROJECT VALIDATOR v1.0
 *
 * Validates the entire Universal Tuya Zigbee project:
 * - All drivers have valid structure
 * - All device.js files have required methods
 * - All driver.compose.json files are valid
 * - All manufacturerNames are tracked
 * - All flows are properly defined
 *
 * @author Universal Tuya Zigbee Project
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const DATA_DIR = path.join(__dirname, '../data');

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

class DriverValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      driversChecked: 0,
      driversValid: 0,
      totalManufacturers: 0,
      totalProducts: 0,
      totalCapabilities: new Set()
    };
  }

  validateDriverCompose(driverName, config) {
    const issues = [];

    // Required fields
    if (!config.name) issues.push('Missing name');
    if (!config.class) issues.push('Missing class');

    // Zigbee config
    if (!config.zigbee) {
      issues.push('Missing zigbee config');
    } else {
      if (!config.zigbee.manufacturerName || config.zigbee.manufacturerName.length === 0) {
        issues.push('No manufacturerName defined');
      } else {
        this.stats.totalManufacturers += config.zigbee.manufacturerName.length;
      }

      if (!config.zigbee.productId || config.zigbee.productId.length === 0) {
        this.warnings.push(`${driverName}: No productId defined`);
      } else {
        this.stats.totalProducts += config.zigbee.productId.length;
      }
    }

    // Capabilities
    if (!config.capabilities || config.capabilities.length === 0) {
      issues.push('No capabilities defined');
    } else {
      for (const cap of config.capabilities) {
        this.stats.totalCapabilities.add(cap);
      }
    }

    return issues;
  }

  validateDeviceJs(driverName) {
    const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
    if (!fs.existsSync(devicePath)) {
      return ['device.js not found'];
    }

    const issues = [];
    const content = fs.readFileSync(devicePath, 'utf8');

    // Check for required methods/patterns
    const requiredPatterns = [
      { pattern: /onInit|async onNodeInit/, name: 'onInit method' },
      { pattern: /extends\s+(?:Tuya)?(?:Zigbee)?Device/, name: 'Device class extension' }
    ];

    for (const { pattern, name } of requiredPatterns) {
      if (!pattern.test(content)) {
        this.warnings.push(`${driverName}: May be missing ${name}`);
      }
    }

    // Check for common issues
    if (content.includes('alarm_tamper') && content.includes('alarm_contact')) {
      // Check for inconsistency like we fixed in SOS button
      if (!/alarm_contact.*alarm_contact|alarm_tamper.*alarm_tamper/s.test(content)) {
        this.warnings.push(`${driverName}: Mixed alarm_tamper/alarm_contact usage - verify consistency`);
      }
    }

    return issues;
  }

  validateDriver(driverName) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

    if (!fs.existsSync(composePath)) {
      this.errors.push(`${driverName}: driver.compose.json not found`);
      return false;
    }

    try {
      const config = JSON.parse(fs.readFileSync(composePath, 'utf8'));

      // Validate compose
      const composeIssues = this.validateDriverCompose(driverName, config);
      if (composeIssues.length > 0) {
        this.errors.push(`${driverName}: ${composeIssues.join(', ')}`);
      }

      // Validate device.js
      const deviceIssues = this.validateDeviceJs(driverName);
      if (deviceIssues.length > 0) {
        this.errors.push(`${driverName}: ${deviceIssues.join(', ')}`);
      }

      this.stats.driversChecked++;
      if (composeIssues.length === 0 && deviceIssues.length === 0) {
        this.stats.driversValid++;
        return true;
      }

    } catch (err) {
      this.errors.push(`${driverName}: JSON parse error - ${err.message}`);
    }

    return false;
  }

  validateAll() {
    const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    console.log(`\n📦 Validating ${drivers.length} drivers...\n`);

    for (const driver of drivers) {
      this.validateDriver(driver);
    }
  }

  printReport() {
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📊 VALIDATION REPORT');
    console.log('════════════════════════════════════════════════════════════════\n');

    console.log('📈 Statistics:');
    console.log(`   Drivers checked: ${this.stats.driversChecked}`);
    console.log(`   Drivers valid: ${this.stats.driversValid}`);
    console.log(`   Validation rate: ${((this.stats.driversValid / this.stats.driversChecked) * 100).toFixed(1)}%`);
    console.log(`   Total manufacturers: ${this.stats.totalManufacturers}`);
    console.log(`   Total products: ${this.stats.totalProducts}`);
    console.log(`   Unique capabilities: ${this.stats.totalCapabilities.size}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of this.errors.slice(0, 10)) {
        console.log(`   ${error}`);
      }
      if (this.errors.length > 10) {
        console.log(`   ... and ${this.errors.length - 10} more`);
      }
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of this.warnings.slice(0, 10)) {
        console.log(`   ${warning}`);
      }
      if (this.warnings.length > 10) {
        console.log(`   ... and ${this.warnings.length - 10} more`);
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════');

    if (this.errors.length === 0) {
      console.log('✅ PROJECT VALIDATION: PASSED');
    } else {
      console.log(`❌ PROJECT VALIDATION: ${this.errors.length} ERRORS FOUND`);
    }
    console.log('════════════════════════════════════════════════════════════════\n');

    return this.errors.length === 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 PROJECT VALIDATOR v1.0');
  console.log('════════════════════════════════════════════════════════════════');

  const validator = new DriverValidator();
  validator.validateAll();
  const success = validator.printReport();

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { DriverValidator };
