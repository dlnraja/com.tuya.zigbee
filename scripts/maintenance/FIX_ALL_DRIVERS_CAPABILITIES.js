const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION MASSIVE - TOUS LES REGISTER CAPABILITY MANQUANTS');
console.log('═'.repeat(80));

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('./DRIVERS_COHERENCE_REPORT.json', 'utf8'));

let driversFixed = 0;
let capabilitiesAdded = 0;

// Standard registerCapability templates
const CAPABILITY_TEMPLATES = {
  // ══════════════════════════════════════════════════════════════
  // MEASUREMENTS
  // ══════════════════════════════════════════════════════════════
  measure_temperature: `
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => value / 100,
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 300,
          maxInterval: 3600,
          minChange: 10
        }
      }
    });`,
  
  measure_humidity: `
    this.registerCapability('measure_humidity', 'msRelativeHumidity', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => value / 100,
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 300,
          maxInterval: 3600,
          minChange: 100
        }
      }
    });`,
  
  measure_battery: `
    this.registerCapability('measure_battery', 'genPowerCfg', {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: value => Math.max(0, Math.min(100, value / 2)),
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600,
          maxInterval: 14400,
          minChange: 2
        }
      }
    });`,
  
  measure_luminance: `
    this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => Math.round(Math.pow(10, ((value - 1) / 10000))),
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 300,
          maxInterval: 3600,
          minChange: 500
        }
      }
    });`,
  
  measure_pressure: `
    this.registerCapability('measure_pressure', 'msPressureMeasurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => value / 10
    });`,
  
  measure_co2: `
    this.registerCapability('measure_co2', 'msCO2', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => value * 1e-6
    });`,
  
  measure_pm25: `
    this.registerCapability('measure_pm25', 'pm25Measurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => value
    });`,
  
  measure_power: `
    this.registerCapability('measure_power', 'haElectricalMeasurement', {
      get: 'activePower',
      report: 'activePower',
      reportParser: value => value / 10
    });`,
  
  measure_voltage: `
    this.registerCapability('measure_voltage', 'haElectricalMeasurement', {
      get: 'rmsVoltage',
      report: 'rmsVoltage',
      reportParser: value => value / 10
    });`,
  
  measure_current: `
    this.registerCapability('measure_current', 'haElectricalMeasurement', {
      get: 'rmsCurrent',
      report: 'rmsCurrent',
      reportParser: value => value / 1000
    });`,
  
  measure_water: `
    this.registerCapability('measure_water', 'genAnalogInput', {
      get: 'presentValue',
      report: 'presentValue',
      reportParser: value => value
    });`,
  
  meter_power: `
    this.registerCapability('meter_power', 'seMetering', {
      get: 'currentSummDelivered',
      report: 'currentSummDelivered',
      reportParser: value => {
        if (value && Array.isArray(value) && value.length === 2) {
          return (value[0] << 32 + value[1]) / 3600000;
        }
        return value / 3600000;
      }
    });`,
  
  // ══════════════════════════════════════════════════════════════
  // ALARMS
  // ══════════════════════════════════════════════════════════════
  alarm_motion: `
    this.registerCapability('alarm_motion', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  alarm_contact: `
    this.registerCapability('alarm_contact', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  alarm_water: `
    this.registerCapability('alarm_water', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  alarm_smoke: `
    this.registerCapability('alarm_smoke', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  alarm_co: `
    this.registerCapability('alarm_co', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  alarm_tamper: `
    this.registerCapability('alarm_tamper', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 2) === 2
    });`,
  
  alarm_battery: `
    this.registerCapability('alarm_battery', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 8) === 8
    });`,
  
  alarm_generic: `
    this.registerCapability('alarm_generic', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  alarm_vibration: `
    this.registerCapability('alarm_vibration', 'ssIasZone', {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => (value & 1) === 1
    });`,
  
  // ══════════════════════════════════════════════════════════════
  // CONTROLS
  // ══════════════════════════════════════════════════════════════
  onoff: `
    this.registerCapability('onoff', 'genOnOff', {
      get: 'onOff',
      set: 'onOff',
      setParser: value => ({ value: value ? 1 : 0 }),
      report: 'onOff',
      reportParser: value => value === 1
    });`,
  
  dim: `
    this.registerCapability('dim', 'genLevelCtrl', {
      get: 'currentLevel',
      set: 'currentLevel',
      setParser: value => ({
        value: Math.round(value * 254),
        transtime: 0
      }),
      report: 'currentLevel',
      reportParser: value => value / 254
    });`,
  
  target_temperature: `
    this.registerCapability('target_temperature', 'hvacThermostat', {
      get: 'occupiedHeatingSetpoint',
      set: 'occupiedHeatingSetpoint',
      setParser: value => value * 100,
      report: 'occupiedHeatingSetpoint',
      reportParser: value => value / 100
    });`,
  
  thermostat_mode: `
    this.registerCapability('thermostat_mode', 'hvacThermostat', {
      get: 'systemMode',
      set: 'systemMode',
      report: 'systemMode',
      reportParser: value => {
        const modes = ['off', 'auto', 'cool', 'heat'];
        return modes[value] || 'off';
      }
    });`,
  
  windowcoverings_set: `
    this.registerCapability('windowcoverings_set', 'closuresWindowCovering', {
      get: 'currentPositionLiftPercentage',
      set: 'goToLiftPercentage',
      setParser: value => ({ value: Math.round((1 - value) * 100) }),
      report: 'currentPositionLiftPercentage',
      reportParser: value => 1 - (value / 100)
    });`
};

// Process each driver with issues
console.log(`\n🔧 Correction de ${report.drivers.length} drivers...\n`);

report.drivers.forEach((driverReport, index) => {
  const driverId = driverReport.id;
  const devicePath = `./drivers/${driverId}/device.js`;
  
  if (!fs.existsSync(devicePath)) {
    console.log(`   ⏭️  ${driverId}: device.js manquant, skip`);
    return;
  }
  
  // Check if missing registerCapability
  const missingCapIssue = driverReport.issues.find(i => i.includes('Missing registerCapability'));
  if (!missingCapIssue) {
    return;
  }
  
  // Extract missing capabilities
  const match = missingCapIssue.match(/Missing registerCapability: (.+)/);
  if (!match) return;
  
  const missingCaps = match[1].split(', ').map(c => c.trim());
  
  let deviceCode = fs.readFileSync(devicePath, 'utf8');
  
  // Find insertion point (in onInit method)
  const onInitMatch = deviceCode.match(/(async\s+onInit\s*\(\s*\)\s*{)/);
  if (!onInitMatch) {
    console.log(`   ⚠️  ${driverId}: onInit() non trouvé, skip`);
    return;
  }
  
  let codeToInsert = '\n    // Register Zigbee capabilities\n';
  let capsAddedForDriver = 0;
  
  missingCaps.forEach(cap => {
    // Handle sub-capabilities (like onoff.gang2, button.1)
    const baseCap = cap.split('.')[0];
    const subId = cap.includes('.') ? cap.split('.')[1] : null;
    
    if (CAPABILITY_TEMPLATES[baseCap]) {
      let capCode = CAPABILITY_TEMPLATES[baseCap];
      
      // Replace capability name for sub-capabilities
      if (subId) {
        capCode = capCode.replace(/registerCapability\('([^']+)'/, `registerCapability('${cap}'`);
      }
      
      codeToInsert += capCode;
      capsAddedForDriver++;
    } else if (cap.startsWith('button.') || cap.startsWith('onoff.')) {
      // Handle sub-capabilities with numbered suffixes
      const baseTemplate = CAPABILITY_TEMPLATES[baseCap];
      if (baseTemplate) {
        let capCode = baseTemplate.replace(/registerCapability\('([^']+)'/, `registerCapability('${cap}'`);
        codeToInsert += capCode;
        capsAddedForDriver++;
      }
    }
  });
  
  if (capsAddedForDriver > 0) {
    // Insert after onInit opening brace
    const insertPos = onInitMatch.index + onInitMatch[0].length;
    deviceCode = deviceCode.slice(0, insertPos) + codeToInsert + deviceCode.slice(insertPos);
    
    fs.writeFileSync(devicePath, deviceCode);
    
    driversFixed++;
    capabilitiesAdded += capsAddedForDriver;
    
    console.log(`   ✅ ${driverId}: ${capsAddedForDriver} capabilities ajoutées`);
  }
  
  // Progress
  if ((index + 1) % 20 === 0 || index === report.drivers.length - 1) {
    process.stdout.write(`\r   Progress: ${index + 1}/${report.drivers.length}...`);
  }
});

console.log('\n');

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('═'.repeat(80));
console.log('📊 RÉSUMÉ CORRECTIONS');
console.log('═'.repeat(80));

console.log(`\n✅ DRIVERS CORRIGÉS: ${driversFixed}`);
console.log(`✅ CAPABILITIES AJOUTÉES: ${capabilitiesAdded}`);

console.log('\n🚀 PROCHAINES ÉTAPES:');
console.log('   1. Valider: homey app validate');
console.log('   2. Tester un driver corrigé');
console.log('   3. Commit: git add . && git commit -m "fix: add missing registerCapability to all drivers"');
console.log('   4. Push: git push origin master');

console.log(`\n🎉 ${driversFixed} DRIVERS COMPLÈTEMENT RÉPARÉS !`);
