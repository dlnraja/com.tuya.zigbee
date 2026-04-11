#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const FIXES = {

  decimalSettings: {
    description: 'Fix settings that should accept decimal values (power compensation, offsets)',
    drivers: ['plug_smart', 'plug_energy_monitor', 'usb_outlet_advanced'],
    settingsToFix: [
      { id: 'power_compensation', step: 0.1, min: -10, max: 10 },
      { id: 'voltage_calibration', step: 0.1, min: -50, max: 50 },
      { id: 'current_calibration', step: 0.01, min: -5, max: 5 },
      { id: 'power_calibration', step: 0.1, min: -100, max: 100 }
    ]
  },

  temperatureOffsetAction: {
    description: 'Add flow action to set temperature offset dynamically',
    drivers: ['radiator_valve', 'thermostat_tuya_dp', 'radiator_controller'],
    action: {
      id: 'set_temperature_offset',
      title: {
        en: 'Set temperature offset',
        nl: 'Temperatuur offset instellen',
        fr: 'Définir offset température',
        de: 'Temperatur-Offset einstellen'
      },
      titleFormatted: {
        en: 'Set temperature offset to [[offset]]°C',
        nl: 'Stel temperatuur offset in op [[offset]]°C',
        fr: 'Définir offset température à [[offset]]°C'
      },
      hint: {
        en: 'Adjust the temperature reading by adding an offset value',
        nl: 'Pas de temperatuurmeting aan door een offset toe te voegen'
      },
      args: [
        {
          name: 'offset',
          type: 'range',
          min: -5,
          max: 5,
          step: 0.5,
          label: '°C'
        }
      ]
    }
  },

  avattoZDMS162: {
    description: 'Add Avatto ZDMS16-2 zigbee dimmer support',
    driver: 'dimmer_dual_channel',
    manufacturerIds: [
      '_TZE204_bxoo2swd',
      '_TZE200_bxoo2swd',
      '_TZE204_zenj4lxv',
      '_TZE200_zenj4lxv'
    ],
    productId: 'TS0601'
  },

  lidlSilvercrestEnergyFix: {
    description: 'Add Lidl Silvercrest energy plug with correct power scaling',
    driver: 'plug_smart',
    manufacturerIds: [
      '_TZ3000_kdi2o9m6',
      '_TZ3000_g5xawfcq'
    ],
    settings: [
      {
        id: 'power_scaling_factor',
        type: 'number',
        label: { en: 'Power Scaling Factor', de: 'Leistungs-Skalierungsfaktor' },
        value: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
        hint: { en: 'Multiply reported power by this factor (1 = no change)', de: 'Gemeldete Leistung mit diesem Faktor multiplizieren' }
      }
    ]
  },

  sonoffTRVZB: {
    description: 'Enhance Sonoff TRVZB thermostat support',
    driver: 'radiator_valve',
    manufacturerIds: [
      '_TZE200_e9ba97vf',
      '_TZE200_husqqvux',
      '_TZE200_kds0pmmv',
      '_TZE200_kly8gjlz',
      '_TZE200_lnbfnyxd',
      '_TZE200_mudxchsu'
    ]
  }
};

async function readJSON(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function createBackup(filePath) {
  const timestamp = Date.now();
  const backupPath = `${filePath}.backup-zigbee-fixes-${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

function settingExists(driver, settingId) {
  if (!driver.settings) return false;
  const checkSetting = (settings) => {
    for (const s of settings) {
      if (s.id === settingId) return true;
      if (s.children && checkSetting(s.children)) return true;
    }
    return false;
  };
  return checkSetting(driver.settings);
}

function actionExists(driver, actionId) {
  if (!driver.flow?.actions) return false;
  return driver.flow.actions.some(a => a.id === actionId);
}

function manufacturerIdExists(driver, id) {
  if (!driver.zigbee?.manufacturerName) return false;
  return driver.zigbee.manufacturerName.some(m =>
    m.toLowerCase() === id.toLowerCase()
  );
}

async function fixDecimalSettings(driverPath, fix) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver;

  try {
    driver = await readJSON(composePath);
  } catch { return { skipped: true, reason: 'Cannot read driver' }; }

  let modified = false;
  const changes = [];

  if (!driver.settings) driver.settings = [];

  for (const settingFix of fix.settingsToFix) {
    if (!settingExists(driver, settingFix.id)) {
      driver.settings.push({
        id: settingFix.id,
        type: 'number',
        label: {
          en: settingFix.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          fr: settingFix.id.replace(/_/g, ' ')
        },
        value: 0,
        min: settingFix.min,
        max: settingFix.max,
        step: settingFix.step,
        hint: { en: `Adjust ${settingFix.id.replace(/_/g, ' ')} (supports decimals)` }
      });
      changes.push(`Added ${settingFix.id} with step=${settingFix.step}`);
      modified = true;
    }
  }

  if (modified) {
    await createBackup(composePath);
    await writeJSON(composePath, driver);
    return { success: true, changes };
  }

  return { skipped: true, reason: 'Settings already exist' };
}

async function addFlowAction(driverPath, fix) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver;

  try {
    driver = await readJSON(composePath);
  } catch { return { skipped: true, reason: 'Cannot read driver' }; }

  if (actionExists(driver, fix.action.id)) {
    return { skipped: true, reason: 'Action already exists' };
  }

  if (!driver.flow) driver.flow = {};
  if (!driver.flow.actions) driver.flow.actions = [];

  driver.flow.actions.push(fix.action);

  await createBackup(composePath);
  await writeJSON(composePath, driver);

  return { success: true, changes: [`Added action ${fix.action.id}`] };
}

async function addManufacturerIds(driverPath, ids) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver;

  try {
    driver = await readJSON(composePath);
  } catch { return { skipped: true, reason: 'Cannot read driver' }; }

  if (!driver.zigbee) driver.zigbee = {};
  if (!driver.zigbee.manufacturerName) driver.zigbee.manufacturerName = [];

  const added = [];
  for (const id of ids) {
    if (!manufacturerIdExists(driver, id)) {
      driver.zigbee.manufacturerName.push(id);
      added.push(id);
    }
  }

  if (added.length > 0) {
    driver.zigbee.manufacturerName.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    await createBackup(composePath);
    await writeJSON(composePath, driver);
    return { success: true, changes: added };
  }

  return { skipped: true, reason: 'IDs already exist' };
}

async function applyAllFixes() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('APPLYING FORUM ZIGBEE FIXES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const driversDir = path.join(__dirname, '../drivers');
  const results = { success: 0, skipped: 0, errors: 0 };
  const details = [];

  console.log('1️⃣ FIXING DECIMAL SETTINGS (power compensation)...\n');
  for (const driverName of FIXES.decimalSettings.drivers) {
    const driverPath = path.join(driversDir, driverName);
    try {
      const result = await fixDecimalSettings(driverPath, FIXES.decimalSettings);
      if (result.success) {
        console.log(`✅ ${driverName}: ${result.changes.join(', ')}`);
        results.success++;
        details.push({ driver: driverName, fix: 'decimalSettings', ...result });
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`❌ ${driverName}: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n2️⃣ ADDING TEMPERATURE OFFSET ACTION...\n');
  for (const driverName of FIXES.temperatureOffsetAction.drivers) {
    const driverPath = path.join(driversDir, driverName);
    try {
      const result = await addFlowAction(driverPath, FIXES.temperatureOffsetAction);
      if (result.success) {
        console.log(`✅ ${driverName}: ${result.changes.join(', ')}`);
        results.success++;
        details.push({ driver: driverName, fix: 'temperatureOffsetAction', ...result });
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`❌ ${driverName}: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n3️⃣ ADDING AVATTO ZDMS16-2 DIMMER SUPPORT...\n');
  {
    const driverPath = path.join(driversDir, FIXES.avattoZDMS162.driver);
    try {
      const result = await addManufacturerIds(driverPath, FIXES.avattoZDMS162.manufacturerIds);
      if (result.success) {
        console.log(`✅ ${FIXES.avattoZDMS162.driver}: Added ${result.changes.length} IDs`);
        result.changes.forEach(id => console.log(`   - ${id}`));
        results.success++;
        details.push({ driver: FIXES.avattoZDMS162.driver, fix: 'avattoZDMS162', ...result });
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`❌ ${FIXES.avattoZDMS162.driver}: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n4️⃣ ADDING LIDL SILVERCREST ENERGY FIX...\n');
  {
    const driverPath = path.join(driversDir, FIXES.lidlSilvercrestEnergyFix.driver);
    try {
      const result = await addManufacturerIds(driverPath, FIXES.lidlSilvercrestEnergyFix.manufacturerIds);
      if (result.success) {
        console.log(`✅ ${FIXES.lidlSilvercrestEnergyFix.driver}: Added ${result.changes.length} IDs`);
        results.success++;
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n5️⃣ ADDING SONOFF TRVZB THERMOSTAT IDs...\n');
  {
    const driverPath = path.join(driversDir, FIXES.sonoffTRVZB.driver);
    try {
      const result = await addManufacturerIds(driverPath, FIXES.sonoffTRVZB.manufacturerIds);
      if (result.success) {
        console.log(`✅ ${FIXES.sonoffTRVZB.driver}: Added ${result.changes.length} IDs`);
        result.changes.forEach(id => console.log(`   - ${id}`));
        results.success++;
      } else {
        console.log(`⏭️ ${FIXES.sonoffTRVZB.driver}: ${result.reason}`);
        results.skipped++;
      }
    } catch (err) {
      console.error(`❌ ${FIXES.sonoffTRVZB.driver}: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Successful fixes: ${results.success}`);
  console.log(`⏭️ Skipped (already done): ${results.skipped}`);
  console.log(`❌ Errors: ${results.errors}`);

  const reportPath = path.join(__dirname, '../ZIGBEE_FORUM_FIXES_REPORT.json');
  await writeJSON(reportPath, {
    timestamp: new Date().toISOString(),
    results,
    details
  });
  console.log(`\n📄 Report: ${reportPath}`);

  return results;
}

if (require.main === module) {
  applyAllFixes()
    .then((results) => {
      console.log(`\n✅ ZIGBEE FORUM FIXES COMPLETE (${results.success} applied)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR:', err);
      process.exit(1);
    });
}

module.exports = { applyAllFixes };
