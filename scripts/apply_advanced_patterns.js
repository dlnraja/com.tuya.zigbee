#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const ADVANCED_PATTERNS = {

  wallControllerEvents: {
    drivers: ['button_wireless', 'button_scene', 'dimmer_knob'],
    triggers: [
      {
        id: 'key_held',
        title: { en: 'Key held down', nl: 'Toets ingedrukt gehouden', fr: 'Touche maintenue' },
        hint: { en: 'Triggered when a button is held down (for continuous dimming)', nl: 'Geactiveerd wanneer een knop ingedrukt wordt gehouden' },
        tokens: [
          { name: 'button', type: 'number', title: { en: 'Button number' }, example: 1 }
        ]
      },
      {
        id: 'key_released',
        title: { en: 'Key released', nl: 'Toets losgelaten', fr: 'Touche relâchée' },
        hint: { en: 'Triggered when a held button is released', nl: 'Geactiveerd wanneer een ingedrukte knop wordt losgelaten' },
        tokens: [
          { name: 'button', type: 'number', title: { en: 'Button number' }, example: 1 }
        ]
      }
    ]
  },

  curtainHoldAction: {
    drivers: ['curtain_motor', 'curtain_motor_tilt'],
    actions: [
      {
        id: 'curtain_hold',
        title: { en: 'Hold curtain position', nl: 'Gordijn positie vasthouden', fr: 'Maintenir position rideau' },
        titleFormatted: { en: 'Hold [[device]] at current position', nl: 'Houd [[device]] op huidige positie' },
        hint: { en: 'Stop curtain movement and hold at current position', nl: 'Stop gordijn beweging en houd huidige positie vast' }
      },
      {
        id: 'curtain_open_partial',
        title: { en: 'Open curtain partially', nl: 'Gordijn gedeeltelijk openen', fr: 'Ouvrir rideau partiellement' },
        titleFormatted: { en: 'Open [[device]] to [[position]]%', nl: 'Open [[device]] naar [[position]]%' },
        args: [
          {
            type: 'range',
            name: 'position',
            min: 0,
            max: 100,
            step: 1,
            label: '%',
            labelMultiplier: 1
          }
        ]
      }
    ]
  },

  forcedBrightness: {
    drivers: ['dimmer_wall_1gang', 'dimmer_wall_2gang', 'bulb_white', 'bulb_rgb'],
    actions: [
      {
        id: 'set_forced_brightness',
        title: { en: 'Set forced brightness', nl: 'Forceer helderheid', fr: 'Forcer luminosité' },
        titleFormatted: { en: 'Set [[device]] to [[brightness]]% brightness', nl: 'Zet [[device]] op [[brightness]]% helderheid' },
        hint: { en: 'Force a specific brightness level, ignoring current state', nl: 'Forceer een specifiek helderheidsniveau, negeer huidige status' },
        args: [
          {
            type: 'range',
            name: 'brightness',
            min: 1,
            max: 100,
            step: 1,
            label: '%',
            labelMultiplier: 1
          }
        ]
      }
    ]
  },

  dimUpDown: {
    drivers: ['dimmer_wall_1gang', 'dimmer_wall_2gang', 'bulb_white', 'bulb_rgb'],
    actions: [
      {
        id: 'dim_up',
        title: { en: 'Dim up', nl: 'Omhoog dimmen', fr: 'Augmenter luminosité' },
        titleFormatted: { en: 'Dim [[device]] up by [[step]]%', nl: 'Dim [[device]] omhoog met [[step]]%' },
        args: [
          {
            type: 'range',
            name: 'step',
            min: 1,
            max: 50,
            step: 1,
            label: '%',
            labelMultiplier: 1
          }
        ]
      },
      {
        id: 'dim_down',
        title: { en: 'Dim down', nl: 'Omlaag dimmen', fr: 'Diminuer luminosité' },
        titleFormatted: { en: 'Dim [[device]] down by [[step]]%', nl: 'Dim [[device]] omlaag met [[step]]%' },
        args: [
          {
            type: 'range',
            name: 'step',
            min: 1,
            max: 50,
            step: 1,
            label: '%',
            labelMultiplier: 1
          }
        ]
      }
    ]
  },

  energyAlerts: {
    drivers: ['plug_smart', 'usb_outlet_advanced'],
    triggers: [
      {
        id: 'power_exceeded',
        title: { en: 'Power exceeded threshold', nl: 'Vermogen overschrijdt drempel', fr: 'Puissance dépassée' },
        hint: { en: 'Triggered when power consumption exceeds a set threshold', nl: 'Geactiveerd wanneer stroomverbruik drempel overschrijdt' },
        tokens: [
          { name: 'power', type: 'number', title: { en: 'Current power (W)' }, example: 150 },
          { name: 'threshold', type: 'number', title: { en: 'Threshold (W)' }, example: 100 }
        ]
      },
      {
        id: 'standby_detected',
        title: { en: 'Standby mode detected', nl: 'Standby modus gedetecteerd', fr: 'Mode veille détecté' },
        hint: { en: 'Triggered when device enters low power standby mode', nl: 'Geactiveerd wanneer apparaat in standby gaat' },
        tokens: [
          { name: 'power', type: 'number', title: { en: 'Standby power (W)' }, example: 0.5 }
        ]
      }
    ],
    settings: [
      {
        id: 'power_threshold',
        type: 'number',
        label: { en: 'Power alert threshold', nl: 'Vermogen waarschuwing drempel' },
        hint: { en: 'Alert when power exceeds this value (Watts)', nl: 'Waarschuwing wanneer vermogen deze waarde overschrijdt' },
        units: 'W',
        value: 100,
        min: 1,
        max: 3680,
        step: 1
      },
      {
        id: 'standby_threshold',
        type: 'number',
        label: { en: 'Standby detection threshold', nl: 'Standby detectie drempel' },
        hint: { en: 'Consider device in standby below this power (Watts)', nl: 'Beschouw apparaat als standby onder dit vermogen' },
        units: 'W',
        value: 2,
        min: 0.1,
        max: 10,
        step: 0.1
      }
    ]
  },

  batteryAlerts: {
    drivers: ['motion_sensor', 'contact_sensor', 'water_leak_sensor', 'smoke_detector_advanced', 'button_wireless'],
    triggers: [
      {
        id: 'battery_low',
        title: { en: 'Battery low', nl: 'Batterij bijna leeg', fr: 'Batterie faible' },
        hint: { en: 'Triggered when battery level drops below threshold', nl: 'Geactiveerd wanneer batterijniveau onder drempel zakt' },
        tokens: [
          { name: 'level', type: 'number', title: { en: 'Battery level (%)' }, example: 15 }
        ]
      }
    ],
    settings: [
      {
        id: 'battery_low_threshold',
        type: 'number',
        label: { en: 'Low battery threshold', nl: 'Lage batterij drempel' },
        hint: { en: 'Trigger alert when battery drops below this level', nl: 'Activeer waarschuwing wanneer batterij onder dit niveau zakt' },
        units: '%',
        value: 20,
        min: 5,
        max: 50,
        step: 5
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
  const backupPath = `${filePath}.backup-advanced-patterns-${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

function hasCapability(driver, capability) {
  if (!driver.capabilities) return false;
  return driver.capabilities.includes(capability);
}

function triggerExists(driver, triggerId) {
  if (!driver.flow || !driver.flow.triggers) return false;
  return driver.flow.triggers.some(t => t.id === triggerId);
}

function actionExists(driver, actionId) {
  if (!driver.flow || !driver.flow.actions) return false;
  return driver.flow.actions.some(a => a.id === actionId);
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

async function applyPattern(driverPath, driverName, patternName, pattern) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  let driver;

  try {
    driver = await readJSON(composePath);
  } catch {
    return { skipped: true, reason: 'Cannot read driver.compose.json' };
  }

  let modified = false;
  const changes = { triggers: [], actions: [], settings: [] };

  if (pattern.triggers) {
    for (const trigger of pattern.triggers) {
      if (!triggerExists(driver, trigger.id)) {
        if (!driver.flow) driver.flow = {};
        if (!driver.flow.triggers) driver.flow.triggers = [];
        driver.flow.triggers.push(trigger);
        changes.triggers.push(trigger.id);
        modified = true;
      }
    }
  }

  if (pattern.actions) {
    for (const action of pattern.actions) {
      if (!actionExists(driver, action.id)) {
        if (!driver.flow) driver.flow = {};
        if (!driver.flow.actions) driver.flow.actions = [];
        driver.flow.actions.push(action);
        changes.actions.push(action.id);
        modified = true;
      }
    }
  }

  if (pattern.settings) {
    for (const setting of pattern.settings) {
      if (!settingExists(driver, setting.id)) {
        if (!driver.settings) driver.settings = [];
        driver.settings.push(setting);
        changes.settings.push(setting.id);
        modified = true;
      }
    }
  }

  if (modified) {
    await createBackup(composePath);
    await writeJSON(composePath, driver);
    return { added: true, changes };
  }

  return { skipped: true, reason: 'No new items to add' };
}

async function applyAdvancedPatterns() {
  console.log('🔧 APPLYING ADVANCED PATTERNS FROM FORUM ANALYSIS\n');

  const stats = {};
  const details = {};

  for (const [patternName, pattern] of Object.entries(ADVANCED_PATTERNS)) {
    stats[patternName] = { added: 0, skipped: 0 };
    details[patternName] = [];
  }

  const allDrivers = await findDrivers();

  for (const [patternName, pattern] of Object.entries(ADVANCED_PATTERNS)) {
    const targetDrivers = pattern.drivers || [];

    for (const driverName of allDrivers) {
      if (!targetDrivers.some(target => driverName.includes(target))) {
        continue;
      }

      const driverPath = path.join(__dirname, '../drivers', driverName);

      try {
        const result = await applyPattern(driverPath, driverName, patternName, pattern);

        if (result.added) {
          stats[patternName].added++;
          details[patternName].push({ driver: driverName, ...result });
          console.log(`✅ ${patternName}: ${driverName}`);
          if (result.changes.triggers.length) console.log(`   Triggers: ${result.changes.triggers.join(', ')}`);
          if (result.changes.actions.length) console.log(`   Actions: ${result.changes.actions.join(', ')}`);
          if (result.changes.settings.length) console.log(`   Settings: ${result.changes.settings.join(', ')}`);
        } else {
          stats[patternName].skipped++;
        }
      } catch (err) {
        console.error(`❌ ${patternName}: ${driverName} - ${err.message}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalAdded = 0;
  for (const [patternName, stat] of Object.entries(stats)) {
    if (stat.added > 0) {
      console.log(`${patternName}: ✅ ${stat.added} drivers`);
      totalAdded += stat.added;
    }
  }

  console.log(`\nTOTAL DRIVERS ENHANCED: ${totalAdded}`);

  const reportPath = path.join(__dirname, '../ADVANCED_PATTERNS_REPORT.json');
  await writeJSON(reportPath, { stats, details, timestamp: new Date().toISOString() });
  console.log(`\n📄 Report saved: ${reportPath}`);

  return { stats, totalAdded };
}

if (require.main === module) {
  applyAdvancedPatterns()
    .then(({ totalAdded }) => {
      console.log(`\n✅ ADVANCED PATTERNS APPLIED (${totalAdded} drivers enhanced)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR:', err);
      process.exit(1);
    });
}

module.exports = { applyAdvancedPatterns };
