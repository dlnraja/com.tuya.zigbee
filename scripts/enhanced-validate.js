#!/usr/bin/env node

/**
 * Enhanced Validation Script for Homey Tuya Zigbee
 * 
 * Features:
 * - Comprehensive validation of device drivers
 * - Automatic detection of common issues
 * - Support for both Tuya and Zigbee devices
 * - Detailed reporting in multiple formats (JSON, Markdown, Console)
 * - Performance optimization with caching
 * - Integration with CI/CD pipelines
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
let CLUSTER = {};
try {
  ({ CLUSTER } = require('zigbee-clusters'));
} catch (e) {
  console.warn('[enhanced-validate] zigbee-clusters not installed, using fallback cluster names');
  CLUSTER = {
    BASIC: 'genBasic',
    ON_OFF: 'genOnOff',
    LEVEL_CONTROL: 'genLevelCtrl',
    POWER_CONFIGURATION: 'genPowerCfg',
    TEMPERATURE_MEASUREMENT: 'msTemperatureMeasurement',
    RELATIVE_HUMIDITY_MEASUREMENT: 'msRelativeHumidity',
    OCCUPANCY_SENSING: 'msOccupancySensing',
    ILLUMINANCE_MEASUREMENT: 'msIlluminanceMeasurement',
    PRESSURE_MEASUREMENT: 'msPressureMeasurement',
    MANUFACTURER_SPECIFIC_TUYA: 'manuSpecificTuya',
  };
}
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

// Schema for driver.compose.json
const COMPOSE_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'class', 'capabilities'],
  properties: {
    id: { type: 'string' },
    name: { type: 'object' },
    class: { type: 'string' },
    capabilities: { type: 'array', items: { type: 'string' } },
    zigbee: {
      type: 'object',
      properties: {
        manufacturerName: { anyOf: [ { type: 'string' }, { type: 'array', items: { type: 'string' } } ] },
        modelId: { type: 'array', items: { type: 'string' } },
        endpoints: {
          type: 'object',
          patternProperties: {
            '^\d+$': {
              type: 'object',
              properties: {
                clusters: { type: 'array', items: { anyOf: [ { type: 'string' }, { type: 'number' } ] } },
                bindings: { type: 'array', items: { anyOf: [ { type: 'string' }, { type: 'number' } ] } }
              }
            }
          }
        }
      },
      required: ['manufacturerName', 'modelId']
    },
    settings: { type: 'array' },
    images: { type: 'object' },
    flow: { type: 'object' },
    pair: { type: 'array' },
    fusion: { type: 'object' }
  }
};

class EnhancedValidator {
  constructor() {
    this.startTime = Date.now();
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDrivers: 0,
        validDrivers: 0,
        invalidDrivers: 0,
        tuyaDrivers: 0,
        zigbeeDrivers: 0,
        errors: [],
        warnings: [],
        performance: {
          startTime: this.startTime,
          endTime: null,
          duration: null
        }
      },
      details: {}
    };
    
    // Caches for performance
    this.validationCache = new Map();
    this.fileCache = new Map();
    
    // Known clusters and capabilities
    this.knownClusters = new Set(Object.values(CLUSTER));
    this.knownCapabilities = [
      'onoff', 'dim', 'measure_power', 'measure_voltage', 'measure_current',
      'measure_temperature', 'measure_humidity', 'measure_pressure',
      'measure_co2', 'measure_pm25', 'measure_noise', 'measure_rain',
      'measure_wind_strength', 'measure_wind_angle', 'measure_gust_strength',
      'measure_gust_angle', 'measure_battery', 'alarm_battery', 'alarm_contact',
      'alarm_co', 'alarm_co2', 'alarm_smoke', 'alarm_water', 'alarm_tamper',
      'alarm_generic', 'button', 'button.reset_meter', 'button.identify',
      'button.any', 'button.toggle', 'button.up', 'button.down', 'button.stop',
      'button.open', 'button.close', 'button.flash', 'button.learn', 'button.pair',
      'button.reset', 'button.reset_consumption', 'button.reset_meter',
      'button.reset_alarm', 'button.reset_water_leak', 'button.reset_heat',
      'button.reset_air_quality', 'button.reset_co2', 'button.reset_pm25',
      'button.reset_noise', 'button.reset_rain', 'button.reset_wind',
      'button.reset_gust', 'button.reset_battery', 'button.reset_contact',
      'button.reset_co', 'button.reset_smoke', 'button.reset_water',
      'button.reset_tamper', 'button.reset_generic', 'button.reset_any',
      'button.reset_all', 'button.reset_unknown', 'button.reset_other',
      'button.reset_custom', 'button.reset_custom_1', 'button.reset_custom_2',
      'button.reset_custom_3', 'button.reset_custom_4', 'button.reset_custom_5',
      'button.reset_custom_6', 'button.reset_custom_7', 'button.reset_custom_8',
      'button.reset_custom_9', 'button.reset_custom_10', 'button.reset_custom_11',
      'button.reset_custom_12', 'button.reset_custom_13', 'button.reset_custom_14',
      'button.reset_custom_15', 'button.reset_custom_16', 'button.reset_custom_17',
      'button.reset_custom_18', 'button.reset_custom_19', 'button.reset_custom_20',
      'button.reset_custom_21', 'button.reset_custom_22', 'button.reset_custom_23',
      'button.reset_custom_24', 'button.reset_custom_25', 'button.reset_custom_26',
      'button.reset_custom_27', 'button.reset_custom_28', 'button.reset_custom_29',
      'button.reset_custom_30', 'button.reset_custom_31', 'button.reset_custom_32',
      'button.reset_custom_33', 'button.reset_custom_34', 'button.reset_custom_35',
      'button.reset_custom_36', 'button.reset_custom_37', 'button.reset_custom_38',
      'button.reset_custom_39', 'button.reset_custom_40', 'button.reset_custom_41',
      'button.reset_custom_42', 'button.reset_custom_43', 'button.reset_custom_44',
      'button.reset_custom_45', 'button.reset_custom_46', 'button.reset_custom_47',
      'button.reset_custom_48', 'button.reset_custom_49', 'button.reset_custom_50',
      'button.reset_custom_51', 'button.reset_custom_52', 'button.reset_custom_53',
      'button.reset_custom_54', 'button.reset_custom_55', 'button.reset_custom_56',
      'button.reset_custom_57', 'button.reset_custom_58', 'button.reset_custom_59',
      'button.reset_custom_60', 'button.reset_custom_61', 'button.reset_custom_62',
      'button.reset_custom_63', 'button.reset_custom_64'
    ];
    
    // Expected capabilities by device type
    this.expectedCapabilities = {
      'plug': ['onoff', 'measure_power'],
      'switch': ['onoff'],
      'light': ['onoff', 'dim'],
      'dimmer': ['onoff', 'dim'],
      'sensor': ['measure_temperature', 'measure_humidity'],
      'motion': ['alarm_motion'],
      'contact': ['alarm_contact'],
      'thermostat': ['target_temperature', 'measure_temperature'],
      'cover': ['windowcoverings_state', 'windowcoverings_set']
    };
  }

  async execute() {
    console.log('🚀 Starting enhanced validation...');
    
    try {
      // Scan and validate all drivers
      await this.scanDriversDirectory('drivers/tuya');
      await this.scanDriversDirectory('drivers/zigbee');
      
      // Generate reports
      await this.generateReports();
      
      // Update performance metrics
      this.report.summary.performance.endTime = Date.now();
      this.report.summary.performance.duration = 
        this.report.summary.performance.endTime - this.startTime;
      
      // Print summary
      this.printSummary();
      
      // Exit with appropriate status code
      process.exit(this.report.summary.invalidDrivers > 0 ? 1 : 0);
    } catch (error) {
      console.error('❌ Fatal error during validation:', error);
      process.exit(1);
    }
  }

  async scanDriversDirectory(baseDir) {
    if (!await this.directoryExists(baseDir)) {
      console.log(`⚠️  Directory not found: ${baseDir}`);
      return;
    }
    
    console.log(`🔍 Scanning directory: ${baseDir}`);
    
    const categories = await fs.readdir(baseDir);
    
    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (!stat.isDirectory()) continue;
      
      const drivers = await fs.readdir(categoryPath);
      
      for (const driver of drivers) {
        const driverPath = path.join(categoryPath, driver);
        const driverStat = await fs.stat(driverPath);
        
        if (driverStat.isDirectory()) {
          await this.validateDriver(driverPath, category, driver);
        }
      }
    }
  }

  async validateDriver(driverPath, category, driverName) {
    const driverKey = `${category}/${driverName}`;
    console.log(`\n🔧 Validating: ${driverKey}`);
    
    // Initialize validation result
    const validation = {
      path: driverPath,
      category,
      name: driverName,
      valid: true,
      errors: [],
      warnings: [],
      files: {},
      metadata: {}
    };
    
    try {
      // Check required files
      await this.checkRequiredFiles(driverPath, validation);
      
      // Validate driver.compose.json
      if (validation.valid) {
        await this.validateComposeFile(driverPath, validation);
      }
      
      // Validate device.js
      if (validation.valid) {
        await this.validateDeviceFile(driverPath, validation);
      }
      
      // Check assets
      await this.validateAssets(driverPath, validation);
      
      // Check for common issues
      this.checkCommonIssues(validation);
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation failed: ${error.message}`);
      console.error(`❌ Error validating ${driverKey}:`, error);
    }
    
    // Update report
    this.updateReport(validation);
    
    return validation;
  }

  async checkRequiredFiles(driverPath, validation) {
    const requiredFiles = [
      'device.js',
      'driver.compose.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(driverPath, file);
      
      try {
        const exists = await this.fileExists(filePath);
        validation.files[file] = exists ? 'found' : 'missing';
        
        if (!exists) {
          validation.valid = false;
          validation.errors.push(`Missing required file: ${file}`);
        }
      } catch (error) {
        validation.files[file] = 'error';
        validation.valid = false;
        validation.errors.push(`Error checking file ${file}: ${error.message}`);
      }
    }
    
    // Check for assets directory
    const assetsPath = path.join(driverPath, 'assets');
    const hasAssets = await this.directoryExists(assetsPath);
    validation.files['assets/'] = hasAssets ? 'found' : 'missing';
    
    if (!hasAssets) {
      validation.warnings.push('Missing assets directory');
    }
  }

  async validateComposeFile(driverPath, validation) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    try {
      // Read and parse file
      const content = await this.readFile(composePath);
      let compose;
      
      try {
        compose = JSON.parse(content);
        validation.metadata.compose = compose;
      } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
      
      // Validate against schema
      const validate = ajv.compile(COMPOSE_SCHEMA);
      const valid = validate(compose);
      
      if (!valid) {
        validation.valid = false;
        validation.errors.push(
          'Invalid driver.compose.json:\n' +
          validate.errors.map(e => `- ${e.instancePath} ${e.message}`).join('\n')
        );
        return;
      }
      
      // Check for required fields
      if (!compose.id) {
        validation.valid = false;
        validation.errors.push('Missing required field: id');
      }
      
      if (!compose.name || !compose.name.en) {
        validation.warnings.push('Missing or incomplete name localization');
      }
      
      // Check capabilities
      if (compose.capabilities && Array.isArray(compose.capabilities)) {
        const invalidCaps = compose.capabilities.filter(
          cap => !this.knownCapabilities.includes(cap)
        );
        
        if (invalidCaps.length > 0) {
          validation.warnings.push(
            `Unknown capabilities: ${invalidCaps.join(', ')}`
          );
        }
        
        // Check for expected capabilities based on device type
        const deviceType = this.detectDeviceType(driverPath);
        if (deviceType && this.expectedCapabilities[deviceType]) {
          const missingCaps = this.expectedCapabilities[deviceType].filter(
            cap => !compose.capabilities.includes(cap)
          );
          
          if (missingCaps.length > 0) {
            validation.warnings.push(
              `Missing recommended capabilities for ${deviceType}: ${missingCaps.join(', ')}`
            );
          }
        }
      }
      
      // Check Zigbee specific fields
      if (compose.zigbee) {
        if (!compose.zigbee.manufacturerName) {
          validation.warnings.push('Missing manufacturer name in zigbee config');
        }
        
        if (!compose.zigbee.modelId || !Array.isArray(compose.zigbee.modelId) || 
            compose.zigbee.modelId.length === 0) {
          validation.warnings.push('Missing or empty modelId in zigbee config');
        }
        
        // Check clusters
        if (compose.zigbee.endpoints) {
          const invalidClusters = [];
          
          for (const [endpoint, config] of Object.entries(compose.zigbee.endpoints)) {
            if (config.clusters && Array.isArray(config.clusters)) {
              for (const cluster of config.clusters) {
                // Accept numeric cluster IDs directly
                if (typeof cluster === 'number') continue;
                if (!this.knownClusters.has(cluster)) {
                  invalidClusters.push(`${cluster} (endpoint ${endpoint})`);
                }
              }
            }
            if (config.bindings && Array.isArray(config.bindings)) {
              for (const binding of config.bindings) {
                if (typeof binding === 'number') continue;
                if (!this.knownClusters.has(binding)) {
                  // We treat unknown string bindings as warning but don't fail
                  invalidClusters.push(`${binding} (binding endpoint ${endpoint})`);
                }
              }
            }
          }
          
          if (invalidClusters.length > 0) {
            validation.warnings.push(
              `Unknown Zigbee clusters: ${invalidClusters.join(', ')}`
            );
          }
        }
      }
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Error validating driver.compose.json: ${error.message}`);
    }
  }

  async validateDeviceFile(driverPath, validation) {
    const devicePath = path.join(driverPath, 'device.js');
    
    try {
      const content = await this.readFile(devicePath);
      
      // Basic checks
      if (!content.includes('class')) {
        validation.warnings.push('No class definition found in device.js');
      }
      
      if (!content.includes('extends')) {
        validation.warnings.push('No class inheritance found in device.js');
      }
      
      // Check for required methods
      const requiredMethods = ['onInit', 'onAdded', 'onDeleted'];
      const missingMethods = requiredMethods.filter(
        method => !content.includes(`${method}(`)
      );
      
      if (missingMethods.length > 0) {
        validation.warnings.push(
          `Missing recommended methods: ${missingMethods.join(', ')}`
        );
      }
      
      // Check for common patterns
      this.checkCodePatterns(content, validation);
      
      // Try to load and parse the file
      try {
        // Create a safe context for evaluation
        const sandbox = {
          require: (mod) => {
            // Allow certain modules
            const allowed = [
              'homey',
              'homey-zigbeedriver',
              'zigbee-clusters',
              'path',
              'util',
              'events',
              'util'
            ];
            
            if (allowed.includes(mod) || mod.startsWith('homey-') || mod.startsWith('zigbee-')) {
              return {}; // Mock module
            }
            
            throw new Error(`Module '${mod}' is not allowed in device.js`);
          },
          module: { exports: {} },
          exports: {},
          console,
          __dirname: path.dirname(devicePath),
          __filename: devicePath,
          process: {
            env: { NODE_ENV: 'test' },
            cwd: () => process.cwd(),
            nextTick: process.nextTick
          },
          setTimeout,
          clearTimeout,
          setInterval,
          clearInterval,
          setImmediate,
          clearImmediate,
          Buffer,
          URL,
          URLSearchParams,
          TextEncoder,
          TextDecoder,
          AbortController,
          AbortSignal,
          EventTarget,
          Event,
          CustomEvent,
          Error,
          TypeError,
          RangeError,
          ReferenceError,
          SyntaxError,
          EvalError,
          URIError,
          Object,
          Function,
          Boolean,
          Symbol,
          Error,
          EvalError,
          InternalError,
          RangeError,
          ReferenceError,
          SyntaxError,
          TypeError,
          URIError,
          Number,
          BigInt,
          Math,
          Date,
          String,
          RegExp,
          Array,
          Int8Array,
          Uint8Array,
          Uint8ClampedArray,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
          BigInt64Array,
          BigUint64Array,
          Map,
          Set,
          WeakMap,
          WeakSet,
          ArrayBuffer,
          SharedArrayBuffer,
          DataView,
          JSON,
          Promise,
          Generator,
          GeneratorFunction,
          AsyncFunction,
          Reflect,
          Proxy,
          Intl,
          WebAssembly
        };
        
        // Create a context for the sandbox
        const context = Object.assign(
          Object.create(null),
          sandbox
        );
        
        // Wrap the code in a function to prevent global scope pollution
        const wrappedCode = `
          (function() {
            'use strict';
            ${content}
            return module.exports || exports;
          })();
        `;
        
        // Execute the code in the sandbox
        const vm = require('vm');
        const script = new vm.Script(wrappedCode);
        script.runInNewContext(context);
        
        // If we get here, the code is syntactically valid
        validation.files['device.js'] = 'valid';
        
      } catch (error) {
        validation.valid = false;
        validation.errors.push(`Error in device.js: ${error.message}`);
        validation.files['device.js'] = 'invalid';
      }
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Error reading device.js: ${error.message}`);
      validation.files['device.js'] = 'error';
    }
  }

  async validateAssets(driverPath, validation) {
    const assetsPath = path.join(driverPath, 'assets');
    
    try {
      const exists = await this.directoryExists(assetsPath);
      
      if (!exists) {
        validation.warnings.push('Missing assets directory');
        return;
      }
      
      const files = await fs.readdir(assetsPath);
      
      // Check for required images
      const requiredImages = ['icon.svg', 'images/icon.png'];
      const missingImages = [];
      
      for (const img of requiredImages) {
        const imgPath = path.join(assetsPath, img);
        const imgExists = await this.fileExists(imgPath);
        
        if (!imgExists) {
          missingImages.push(img);
        }
      }
      
      if (missingImages.length > 0) {
        validation.warnings.push(
          `Missing recommended images: ${missingImages.join(', ')}`
        );
      }
      
      // Check image sizes
      for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
          const filePath = path.join(assetsPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.size === 0) {
            validation.warnings.push(`Empty image file: ${file}`);
          } else if (stats.size > 1024 * 100) { // 100KB
            validation.warnings.push(
              `Large image file (${Math.round(stats.size / 1024)}KB): ${file}`
            );
          }
        }
      }
      
    } catch (error) {
      validation.warnings.push(`Error validating assets: ${error.message}`);
    }
  }

  checkCodePatterns(content, validation) {
    // Check for deprecated APIs
    const deprecatedPatterns = [
      { pattern: /homey\.app\./g, message: 'Using homey.app is deprecated, use this.homey instead' },
      { pattern: /\bvar\b/g, message: 'Using var is deprecated, use const or let instead' },
      { pattern: /\bconsole\.log\(/g, message: 'Use this.log instead of console.log' }
    ];
    
    for (const { pattern, message } of deprecatedPatterns) {
      if (pattern.test(content)) {
        validation.warnings.push(message);
      }
    }
    
    // Check for common issues
    const commonIssues = [
      { 
        pattern: /setTimeout\([^,)]*\)/g, 
        message: 'Use this.homey.setTimeout instead of global setTimeout' 
      },
      { 
        pattern: /setInterval\([^,)]*\)/g, 
        message: 'Use this.homey.setInterval instead of global setInterval' 
      },
      { 
        pattern: /clearTimeout\(/g, 
        message: 'Use this.homey.clearTimeout instead of global clearTimeout' 
      },
      { 
        pattern: /clearInterval\(/g, 
        message: 'Use this.homey.clearInterval instead of global clearInterval' 
      }
    ];
    
    for (const { pattern, message } of commonIssues) {
      if (pattern.test(content)) {
        validation.warnings.push(message);
      }
    }
    
    // Check for error handling
    if (!content.includes('try {') || !content.includes('} catch')) {
      validation.warnings.push('Consider adding try/catch blocks for better error handling');
    }
  }

  checkCommonIssues(validation) {
    // Check for common issues across all validations
    if (validation.warnings.length > 5) {
      validation.warnings.push('Many warnings detected, please review carefully');
    }
    
    if (validation.errors.length > 0) {
      validation.valid = false;
    }
  }

  updateReport(validation) {
    const { category, name } = validation;
    const driverKey = `${category}/${name}`;
    
    // Update summary
    this.report.summary.totalDrivers++;
    
    if (category === 'tuya') {
      this.report.summary.tuyaDrivers++;
    } else if (category === 'zigbee') {
      this.report.summary.zigbeeDrivers++;
    }
    
    if (validation.valid) {
      this.report.summary.validDrivers++;
    } else {
      this.report.summary.invalidDrivers++;
      this.report.summary.errors.push(
        `${driverKey}: ${validation.errors.join('; ')}`
      );
    }
    
    // Add warnings
    if (validation.warnings.length > 0) {
      this.report.summary.warnings.push(
        `${driverKey}: ${validation.warnings.join('; ')}`
      );
    }
    
    // Add detailed report
    this.report.details[driverKey] = {
      valid: validation.valid,
      path: validation.path,
      errors: validation.errors,
      warnings: validation.warnings,
      files: validation.files,
      metadata: validation.metadata
    };
  }

  async generateReports() {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    try {
      await fs.mkdir(reportsDir, { recursive: true });
      
      // Generate JSON report
      const jsonReportPath = path.join(reportsDir, 'validation-report.json');
      await fs.writeFile(
        jsonReportPath, 
        JSON.stringify(this.report, null, 2)
      );
      
      // Generate Markdown report
      const markdownReport = this.generateMarkdownReport();
      const markdownPath = path.join(reportsDir, 'validation-report.md');
      await fs.writeFile(markdownPath, markdownReport);
      
      // Generate summary file for CI
      const summaryPath = path.join(reportsDir, 'validation-summary.txt');
      await fs.writeFile(summaryPath, this.generateSummaryText());
      
      console.log(`\n📊 Reports generated in ${reportsDir}/`);
      console.log(`- ${jsonReportPath}`);
      console.log(`- ${markdownPath}`);
      console.log(`- ${summaryPath}`);
      
    } catch (error) {
      console.error('Error generating reports:', error);
      throw error;
    }
  }

  generateMarkdownReport() {
    const { summary, details } = this.report;
    const { totalDrivers, validDrivers, invalidDrivers, tuyaDrivers, zigbeeDrivers } = summary;
    const successRate = totalDrivers > 0 ? (validDrivers / totalDrivers * 100).toFixed(1) : 0;
    
    let report = `# 🚀 Validation Report

**Date:** ${new Date().toLocaleString()}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Drivers | ${totalDrivers} |
| Valid Drivers | ${validDrivers} |
| Invalid Drivers | ${invalidDrivers} |
| Tuya Drivers | ${tuyaDrivers} |
| Zigbee Drivers | ${zigbeeDrivers} |
| Success Rate | ${successRate}% |
| Duration | ${summary.performance.duration}ms |

`;

    // Add errors section
    if (summary.errors.length > 0) {
      report += '## ❌ Errors\n\n';
      report += summary.errors.map(e => `- ${e}`).join('\n') + '\n\n';
    }
    
    // Add warnings section
    if (summary.warnings.length > 0) {
      report += '## ⚠️ Warnings\n\n';
      report += summary.warnings.map(w => `- ${w}`).join('\n') + '\n\n';
    }
    
    // Add details section
    report += '## 📋 Driver Details\n\n';
    
    for (const [driver, data] of Object.entries(details)) {
      const status = data.valid ? '✅' : '❌';
      report += `### ${status} ${driver}\n\n`;
      
      if (!data.valid) {
        report += '**Errors:**\n';
        report += data.errors.map(e => `- ${e}`).join('\n') + '\n\n';
      }
      
      if (data.warnings.length > 0) {
        report += '**Warnings:**\n';
        report += data.warnings.map(w => `- ${w}`).join('\n') + '\n\n';
      }
      
      report += '**Files:**\n';
      report += Object.entries(data.files).map(([file, status]) => 
        `- ${file}: ${status}`
      ).join('\n');
      
      report += '\n\n---\n\n';
    }
    
    return report;
  }

  generateSummaryText() {
    const { summary } = this.report;
    const { totalDrivers, validDrivers, invalidDrivers } = summary;
    
    return `Validation Summary:
` +
      `- Total Drivers: ${totalDrivers}\n` +
      `- Valid: ${validDrivers}\n` +
      `- Invalid: ${invalidDrivers}\n` +
      `- Success Rate: ${totalDrivers > 0 ? (validDrivers / totalDrivers * 100).toFixed(1) : 0}%\n` +
      `- Warnings: ${summary.warnings.length}\n` +
      `- Duration: ${summary.performance.duration}ms\n`;
  }

  printSummary() {
    const { summary } = this.report;
    const { totalDrivers, validDrivers, invalidDrivers } = summary;
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 VALIDATION SUMMARY'.padEnd(58) + '🚀');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Drivers: ${totalDrivers} total, ${validDrivers} valid, ${invalidDrivers} invalid`);
    
    if (summary.tuyaDrivers > 0 || summary.zigbeeDrivers > 0) {
      console.log(`   - Tuya: ${summary.tuyaDrivers}`);
      console.log(`   - Zigbee: ${summary.zigbeeDrivers}`);
    }
    
    console.log(`\n⏱️  Duration: ${summary.performance.duration}ms`);
    
    if (summary.warnings.length > 0) {
      console.log(`\n⚠️  ${summary.warnings.length} warnings detected`);
      if (summary.warnings.length <= 5) {
        summary.warnings.forEach((warn, i) => 
          console.log(`   ${i + 1}. ${warn}`)
        );
      } else {
        console.log('   First 5 warnings:');
        summary.warnings.slice(0, 5).forEach((warn, i) => 
          console.log(`   ${i + 1}. ${warn}`)
        );
        console.log(`   ...and ${summary.warnings.length - 5} more`);
      }
    }
    
    if (summary.errors.length > 0) {
      console.log(`\n❌ ${summary.errors.length} errors detected`);
      if (summary.errors.length <= 5) {
        summary.errors.forEach((err, i) => 
          console.log(`   ${i + 1}. ${err}`)
        );
      } else {
        console.log('   First 5 errors:');
        summary.errors.slice(0, 5).forEach((err, i) => 
          console.log(`   ${i + 1}. ${err}`)
        );
        console.log(`   ...and ${summary.errors.length - 5} more`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (invalidDrivers > 0) {
      console.log('❌ VALIDATION FAILED - Some drivers are invalid');
    } else if (summary.warnings.length > 0) {
      console.log('⚠️  VALIDATION COMPLETED WITH WARNINGS');
    } else {
      console.log('✅ VALIDATION SUCCESSFUL');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  // Utility methods
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async readFile(filePath) {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath);
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    this.fileCache.set(filePath, content);
    return content;
  }

  detectDeviceType(driverPath) {
    const name = path.basename(driverPath).toLowerCase();
    
    const patterns = {
      'plug': /plug|socket|outlet/i,
      'switch': /switch|relay/i,
      'light': /light|bulb|lamp|dimmer/i,
      'sensor': /sensor|meter/i,
      'motion': /motion|presence/i,
      'contact': /contact|door|window/i,
      'thermostat': /thermostat|climate/i,
      'cover': /cover|blind|curtain|shade/i
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(name)) {
        return type;
      }
    }
    
    return null;
  }
}

// Run the validator if this file is executed directly
if (require.main === module) {
  const validator = new EnhancedValidator();
  validator.execute().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = EnhancedValidator;
