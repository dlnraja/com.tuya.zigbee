#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const IMPROVEMENTS = {
  energyScaling: {
    drivers: ['plug_smart', 'plug_switch', 'usb_outlet_advanced', 'plug_basic'],
    settings: {
      type: 'group',
      label: { en: 'Energy Monitoring Calibration', nl: 'Energie Meetwaarde Kalibratie' },
      children: [
        {
          id: 'voltage_scale',
          type: 'dropdown',
          label: { en: 'Voltage scaling', nl: 'Voltage schaling' },
          hint: { en: 'Adjust if voltage readings are incorrect', nl: 'Aanpassen indien voltage niet klopt' },
          value: '0.1',
          values: [
            { id: '0.01', label: { en: '÷100', nl: '÷100' } },
            { id: '0.1', label: { en: '÷10 (default)', nl: '÷10 (standaard)' } },
            { id: '1', label: { en: '×1 (no scaling)', nl: '×1 (geen schaling)' } },
            { id: '10', label: { en: '×10', nl: '×10' } }
          ]
        },
        {
          id: 'current_scale',
          type: 'dropdown',
          label: { en: 'Current scaling', nl: 'Stroom schaling' },
          hint: { en: 'Adjust if current readings are incorrect', nl: 'Aanpassen indien stroom niet klopt' },
          value: '0.001',
          values: [
            { id: '0.001', label: { en: '÷1000 (mA→A)', nl: '÷1000 (mA→A)' } },
            { id: '0.01', label: { en: '÷100', nl: '÷100' } },
            { id: '0.1', label: { en: '÷10', nl: '÷10' } },
            { id: '1', label: { en: '×1', nl: '×1' } }
          ]
        },
        {
          id: 'power_scale',
          type: 'dropdown',
          label: { en: 'Power scaling', nl: 'Vermogen schaling' },
          hint: { en: 'Adjust if power readings are incorrect', nl: 'Aanpassen indien vermogen niet klopt' },
          value: '0.1',
          values: [
            { id: '0.1', label: { en: '÷10 (default)', nl: '÷10 (standaard)' } },
            { id: '1', label: { en: '×1', nl: '×1' } },
            { id: '10', label: { en: '×10', nl: '×10' } }
          ]
        }
      ]
    }
  },

  climateOffset: {
    drivers: ['climate_sensor', 'climate_sensor_soil', 'presence_sensor_radar', 'air_quality_co2'],
    settings: {
      type: 'group',
      label: { en: 'Sensor Calibration', nl: 'Sensor Kalibratie' },
      children: [
        {
          id: 'temperature_offset',
          type: 'number',
          label: { en: 'Temperature offset', nl: 'Temperatuur correctie' },
          hint: { en: 'Adjust sensor reading (±10°C)', nl: 'Pas meetwaarde aan (±10°C)' },
          units: '°C',
          value: 0,
          min: -10,
          max: 10,
          step: 0.1
        },
        {
          id: 'humidity_offset',
          type: 'number',
          label: { en: 'Humidity offset', nl: 'Luchtvochtigheid correctie' },
          hint: { en: 'Adjust sensor reading (±30%)', nl: 'Pas meetwaarde aan (±30%)' },
          units: '%',
          value: 0,
          min: -30,
          max: 30,
          step: 1
        }
      ]
    }
  },

  contactReverse: {
    drivers: ['contact_sensor'],
    settings: [
      {
        id: 'reverse_alarm',
        type: 'checkbox',
        label: { en: 'Reverse alarm logic', nl: 'Alarm logica omkeren' },
        hint: { en: 'Swap open/closed states if sensor reports inverted', nl: 'Wissel open/gesloten om indien sensor omgekeerd rapporteert' },
        value: false
      }
    ]
  },

  curtainMaintenance: {
    drivers: ['curtain_motor'],
    actions: [
      {
        id: 'curtain_calibrate',
        title: { en: 'Calibrate curtain motor', nl: 'Kalibreer gordijnmotor' },
        titleFormatted: { en: 'Calibrate [[device]]', nl: 'Kalibreer [[device]]' },
        hint: { en: 'Run full open/close cycle for position calibration', nl: 'Voer volledige open/sluit cyclus uit voor positie kalibratie' }
      },
      {
        id: 'curtain_reset_position',
        title: { en: 'Reset position to 0%', nl: 'Reset positie naar 0%' },
        titleFormatted: { en: 'Reset [[device]] position', nl: 'Reset [[device]] positie' },
        hint: { en: 'Reset current position to fully closed', nl: 'Reset huidige positie naar volledig gesloten' }
      }
    ]
  },

  dimmerSpeed: {
    drivers: ['dimmer_wall_1gang', 'dimmer_wall_2gang', 'dimmer_wall_3gang'],
    settings: [
      {
        id: 'dim_speed',
        type: 'dropdown',
        label: { en: 'Dimming speed', nl: 'Dim snelheid' },
        hint: { en: 'Transition time when dimming', nl: 'Overgangs tijd bij dimmen' },
        value: 'medium',
        values: [
          { id: 'instant', label: { en: 'Instant', nl: 'Direct' } },
          { id: 'fast', label: { en: 'Fast (0.5s)', nl: 'Snel (0.5s)' } },
          { id: 'medium', label: { en: 'Medium (2s)', nl: 'Gemiddeld (2s)' } },
          { id: 'slow', label: { en: 'Slow (5s)', nl: 'Langzaam (5s)' } }
        ]
      }
    ]
  }
};

async function findDrivers() {
  const driversDir = path.join(__dirname, '../drivers');
  const entries = await fs.readdir(driversDir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function readJSON(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function createBackup(filePath) {
  const timestamp = Date.now();
  const backupPath = `${filePath}.backup-forum-improvements-${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

function hasCapability(driver, capability) {
  if (!driver.capabilities) return false;
  return driver.capabilities.includes(capability);
}

function settingExists(driver, settingId) {
  if (!driver.settings) return false;

  const checkSetting = (settings) => {
    for (const setting of settings) {
      if (setting.id === settingId) return true;
      if (setting.children && checkSetting(setting.children)) return true;
    }
    return false;
  };

  return checkSetting(driver.settings);
}

function actionExists(driver, actionId) {
  if (!driver.flow || !driver.flow.actions) return false;
  return driver.flow.actions.some(a => a.id === actionId);
}

async function applyEnergyScaling(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver = await readJSON(composePath);

  if (!hasCapability(driver, 'measure_power') && !hasCapability(driver, 'meter_power')) {
    return { skipped: true, reason: 'No energy capabilities' };
  }

  if (settingExists(driver, 'voltage_scale')) {
    return { skipped: true, reason: 'Already has scaling settings' };
  }

  await createBackup(composePath);

  if (!driver.settings) driver.settings = [];
  driver.settings.push(IMPROVEMENTS.energyScaling.settings);

  await writeJSON(composePath, driver);
  return { added: true, settings: ['voltage_scale', 'current_scale', 'power_scale'] };
}

async function applyClimateOffset(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver = await readJSON(composePath);

  if (!hasCapability(driver, 'measure_temperature') && !hasCapability(driver, 'measure_humidity')) {
    return { skipped: true, reason: 'No climate capabilities' };
  }

  if (settingExists(driver, 'temperature_offset')) {
    return { skipped: true, reason: 'Already has offset settings' };
  }

  await createBackup(composePath);

  if (!driver.settings) driver.settings = [];

  const offsetSettings = JSON.parse(JSON.stringify(IMPROVEMENTS.climateOffset.settings));

  if (!hasCapability(driver, 'measure_temperature')) {
    offsetSettings.children = offsetSettings.children.filter(s => s.id !== 'temperature_offset');
  }
  if (!hasCapability(driver, 'measure_humidity')) {
    offsetSettings.children = offsetSettings.children.filter(s => s.id !== 'humidity_offset');
  }

  if (offsetSettings.children.length > 0) {
    driver.settings.push(offsetSettings);
    await writeJSON(composePath, driver);
    return { added: true, settings: offsetSettings.children.map(s => s.id) };
  }

  return { skipped: true, reason: 'No applicable offset settings' };
}

async function applyContactReverse(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver = await readJSON(composePath);

  if (!hasCapability(driver, 'alarm_contact')) {
    return { skipped: true, reason: 'No contact capability' };
  }

  if (settingExists(driver, 'reverse_alarm')) {
    return { skipped: true, reason: 'Already has reverse logic' };
  }

  await createBackup(composePath);

  if (!driver.settings) driver.settings = [];
  driver.settings.push(...IMPROVEMENTS.contactReverse.settings);

  await writeJSON(composePath, driver);
  return { added: true, settings: ['reverse_alarm'] };
}

async function applyCurtainMaintenance(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver = await readJSON(composePath);

  if (!hasCapability(driver, 'windowcoverings_set')) {
    return { skipped: true, reason: 'Not a curtain driver' };
  }

  if (actionExists(driver, 'curtain_calibrate')) {
    return { skipped: true, reason: 'Already has maintenance actions' };
  }

  await createBackup(composePath);

  if (!driver.flow) driver.flow = {};
  if (!driver.flow.actions) driver.flow.actions = [];

  driver.flow.actions.push(...IMPROVEMENTS.curtainMaintenance.actions);

  await writeJSON(composePath, driver);
  return { added: true, actions: ['curtain_calibrate', 'curtain_reset_position'] };
}

async function applyDimmerSpeed(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver = await readJSON(composePath);

  if (!hasCapability(driver, 'dim')) {
    return { skipped: true, reason: 'No dim capability' };
  }

  if (settingExists(driver, 'dim_speed')) {
    return { skipped: true, reason: 'Already has dim speed setting' };
  }

  await createBackup(composePath);

  if (!driver.settings) driver.settings = [];
  driver.settings.push(...IMPROVEMENTS.dimmerSpeed.settings);

  await writeJSON(composePath, driver);
  return { added: true, settings: ['dim_speed'] };
}

async function applyImprovements() {
  console.log('🔧 APPLYING FORUM IMPROVEMENTS\n');

  const stats = {
    energyScaling: { added: 0, skipped: 0 },
    climateOffset: { added: 0, skipped: 0 },
    contactReverse: { added: 0, skipped: 0 },
    curtainMaintenance: { added: 0, skipped: 0 },
    dimmerSpeed: { added: 0, skipped: 0 }
  };

  const details = {
    energyScaling: [],
    climateOffset: [],
    contactReverse: [],
    curtainMaintenance: [],
    dimmerSpeed: []
  };

  const allDrivers = await findDrivers();

  for (const improvement of Object.keys(IMPROVEMENTS)) {
    const config = IMPROVEMENTS[improvement];
    const targetDrivers = config.drivers || [];

    for (const driverName of allDrivers) {
      if (targetDrivers.length > 0 && !targetDrivers.some(pattern => driverName.includes(pattern))) {
        continue;
      }

      const driverPath = path.join(__dirname, '../drivers', driverName);
      const composePath = path.join(driverPath, 'driver.compose.json');

      try {
        await fs.access(composePath);
      } catch {
        continue;
      }

      let result;
      try {
        switch (improvement) {
          case 'energyScaling':
            result = await applyEnergyScaling(driverPath, driverName);
            break;
          case 'climateOffset':
            result = await applyClimateOffset(driverPath, driverName);
            break;
          case 'contactReverse':
            result = await applyContactReverse(driverPath, driverName);
            break;
          case 'curtainMaintenance':
            result = await applyCurtainMaintenance(driverPath, driverName);
            break;
          case 'dimmerSpeed':
            result = await applyDimmerSpeed(driverPath, driverName);
            break;
        }

        if (result.added) {
          stats[improvement].added++;
          details[improvement].push({ driver: driverName, ...result });
          console.log(`✅ ${improvement}: ${driverName}`);
        } else if (result.skipped) {
          stats[improvement].skipped++;
        }
      } catch (err) {
        console.error(`❌ ${improvement}: ${driverName} - ${err.message}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const [improvement, stat] of Object.entries(stats)) {
    console.log(`${improvement}:`);
    console.log(`  ✅ Added: ${stat.added}`);
    console.log(`  ⏭️  Skipped: ${stat.skipped}`);
    console.log();
  }

  const totalAdded = Object.values(stats).reduce((sum, s) => sum + s.added, 0);
  console.log(`TOTAL IMPROVEMENTS: ${totalAdded}`);

  const reportPath = path.join(__dirname, '../FORUM_IMPROVEMENTS_REPORT.json');
  await writeJSON(reportPath, { stats, details, timestamp: new Date().toISOString() });
  console.log(`\n📄 Report saved: ${reportPath}`);

  return stats;
}

if (require.main === module) {
  applyImprovements()
    .then(() => {
      console.log('\n✅ FORUM IMPROVEMENTS APPLIED');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR:', err);
      process.exit(1);
    });
}

module.exports = { applyImprovements };
