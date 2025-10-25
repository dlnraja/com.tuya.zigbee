#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * AUTO-IMPLEMENT SENSOR REPORTING
 * Implémente automatiquement le reporting dans tous les drivers
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const REPORT_FILE = path.join(__dirname, '..', 'SENSOR_DATA_FIX_REPORT.json');

console.log('🔧 AUTO-IMPLEMENT SENSOR REPORTING\n');
console.log('═'.repeat(80));

// Load report
const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
const driversToFix = report.details.missingReporting;

console.log(`\n📊 Found ${driversToFix.length} drivers needing reporting\n`);

let fixed = 0;
let errors = 0;

driversToFix.forEach(issue => {
  const driverName = issue.driver;
  const caps = issue.capabilities;
  const deviceFile = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(deviceFile)) {
    console.log(`⚠️  Skip ${driverName}: device.js not found`);
    return;
  }
  
  try {
    let code = fs.readFileSync(deviceFile, 'utf8');
    
    // Find onNodeInit method
    const onNodeInitRegex = /async onNodeInit\(\)\s*\{/;
    
    if (!onNodeInitRegex.test(code)) {
      console.log(`⚠️  Skip ${driverName}: onNodeInit not found`);
      errors++;
      return;
    }
    
    // Build reporting code
    let reportingCode = '\n    // === AUTO-IMPLEMENTED SENSOR REPORTING ===\n';
    reportingCode += '    await this.setupSensorReporting();\n';
    
    // Insert after onNodeInit opening brace
    code = code.replace(
      onNodeInitRegex,
      match => match + reportingCode
    );
    
    // Check if setupSensorReporting method exists
    if (!code.includes('async setupSensorReporting()')) {
      // Add method at end of class
      let methodCode = '\n  async setupSensorReporting() {\n';
      methodCode += '    try {\n';
      
      // Temperature
      if (caps.temperature) {
        methodCode += `
      // Temperature reporting
      this.registerAttrReportListener(
        'msTemperatureMeasurement',
        'measuredValue',
        1,
        300,
        1,
        value => {
          const temperature = value / 100;
          this.log('Temperature:', temperature, '°C');
          this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
        },
        1
      ).catch(err => this.error('Temperature reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'msTemperatureMeasurement',
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 50
      }]).catch(this.error);
`;
      }
      
      // Humidity
      if (caps.humidity) {
        methodCode += `
      // Humidity reporting
      this.registerAttrReportListener(
        'msRelativeHumidity',
        'measuredValue',
        1,
        300,
        1,
        value => {
          const humidity = value / 100;
          this.log('Humidity:', humidity, '%');
          this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
        },
        1
      ).catch(err => this.error('Humidity reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'msRelativeHumidity',
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 100
      }]).catch(this.error);
`;
      }
      
      // Battery
      if (caps.battery) {
        methodCode += `
      // Battery reporting
      this.registerAttrReportListener(
        'genPowerCfg',
        'batteryPercentageRemaining',
        1,
        3600,
        1,
        value => {
          const battery = Math.round(value / 2);
          this.log('Battery:', battery, '%');
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
        },
        1
      ).catch(err => this.error('Battery reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'genPowerCfg',
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 43200,
        minChange: 2
      }]).catch(this.error);
`;
      }
      
      // Illuminance
      if (caps.illuminance) {
        methodCode += `
      // Illuminance reporting
      this.registerAttrReportListener(
        'msIlluminanceMeasurement',
        'measuredValue',
        1,
        300,
        1,
        value => {
          const lux = Math.pow(10, (value - 1) / 10000);
          this.log('Illuminance:', lux, 'lux');
          this.setCapabilityValue('measure_luminance', lux).catch(this.error);
        },
        1
      ).catch(err => this.error('Illuminance reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'msIlluminanceMeasurement',
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 1000
      }]).catch(this.error);
`;
      }
      
      // Motion (IAS Zone)
      if (caps.motion) {
        methodCode += `
      // Motion IAS Zone reporting
      this.registerAttrReportListener(
        'iasZone',
        'zoneStatus',
        1,
        0,
        1,
        value => {
          const motion = !!(value & 0x01);
          this.log('Motion:', motion);
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        },
        1
      ).catch(err => this.error('Motion reporting failed:', err));
      
      // Zone status notification listener
      if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
        this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
          const motion = !!(data.zoneStatus & 0x01);
          this.log('Motion notification:', motion);
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        });
      }
`;
      }
      
      // Contact (IAS Zone)
      if (caps.contact) {
        methodCode += `
      // Contact IAS Zone reporting
      this.registerAttrReportListener(
        'iasZone',
        'zoneStatus',
        1,
        0,
        1,
        value => {
          const contact = !(value & 0x01);
          this.log('Contact:', contact);
          this.setCapabilityValue('alarm_contact', contact).catch(this.error);
        },
        1
      ).catch(err => this.error('Contact reporting failed:', err));
      
      // Zone status notification listener
      if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
        this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
          const contact = !(data.zoneStatus & 0x01);
          this.log('Contact notification:', contact);
          this.setCapabilityValue('alarm_contact', contact).catch(this.error);
        });
      }
`;
      }
      
      methodCode += '\n    } catch (err) {\n';
      methodCode += '      this.error(\'Failed to configure sensor reporting:\', err);\n';
      methodCode += '    }\n';
      methodCode += '  }\n';
      
      // Insert before last closing brace of class
      const classEndRegex = /\n\}\n\nmodule\.exports/;
      code = code.replace(classEndRegex, methodCode + '\n}\n\nmodule.exports');
    }
    
    // Write back
    fs.writeFileSync(deviceFile, code);
    fixed++;
    
    if (fixed <= 20) {
      const capsStr = Object.entries(caps)
        .filter(([_, v]) => v)
        .map(([k, _]) => k.substring(0, 4))
        .join(',');
      console.log(`  ✅ Fixed: ${driverName} (${capsStr})`);
    }
    
  } catch (e) {
    console.error(`  ❌ Error: ${driverName}:`, e.message);
    errors++;
  }
});

if (fixed > 20) {
  console.log(`  ... and ${fixed - 20} more`);
}

console.log('\n' + '═'.repeat(80));
console.log('\n✅ COMPLETE!\n');
console.log(`📊 Summary:`);
console.log(`   - Drivers to fix:    ${driversToFix.length}`);
console.log(`   - Successfully fixed: ${fixed}`);
console.log(`   - Errors:            ${errors}`);
console.log(`\n✅ Sensor reporting auto-implemented!\n`);
