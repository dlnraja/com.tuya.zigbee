#!/usr/bin/env node

/**
 * 🔍 CHECK & FIX CAPABILITIES SDK3
 * 
 * Vérifie toutes les capabilities utilisées et les remplace
 * par des alternatives supportées SDK3
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

/**
 * Capabilities STANDARD Homey SDK3
 * Source: https://apps-sdk-v3.developer.homey.app/tutorial-Drivers-Reference.html
 */
const STANDARD_CAPABILITIES = [
  // Alarm (binary)
  'alarm_motion',
  'alarm_contact',
  'alarm_water',
  'alarm_fire',
  'alarm_smoke',
  'alarm_co',
  'alarm_co2',
  'alarm_pm25',
  'alarm_tamper',
  'alarm_generic',
  
  // Measure (numeric)
  'measure_temperature',
  'measure_humidity',
  'measure_pressure',
  'measure_co',
  'measure_co2',
  'measure_pm25',
  'measure_noise',
  'measure_rain',
  'measure_wind_strength',
  'measure_wind_angle',
  'measure_gust_strength',
  'measure_gust_angle',
  'measure_battery',
  'measure_power',
  'measure_voltage',
  'measure_current',
  'measure_luminance',
  'measure_ultraviolet',
  
  // Meter (numeric)
  'meter_power',
  'meter_water',
  'meter_gas',
  'meter_rain',
  
  // Control
  'onoff',
  'dim',
  'volume_set',
  'volume_mute',
  'volume_up',
  'volume_down',
  'channel_up',
  'channel_down',
  
  // Light
  'light_hue',
  'light_saturation',
  'light_temperature',
  'light_mode',
  
  // Window coverings
  'windowcoverings_state',
  'windowcoverings_set',
  'windowcoverings_tilt_up',
  'windowcoverings_tilt_down',
  'windowcoverings_tilt_set',
  
  // Thermostat
  'target_temperature',
  'thermostat_mode',
  'thermostat_state',
  
  // Locks
  'locked',
  'lock_mode',
  
  // Vacuum
  'vacuumcleaner_state',
  
  // Speaker
  'speaker_playing',
  'speaker_next',
  'speaker_prev',
  'speaker_shuffle',
  'speaker_repeat',
  
  // Button (virtual)
  'button',
];

/**
 * Capabilities NON STANDARD à remplacer
 */
const CAPABILITY_REPLACEMENTS = {
  // alarm_battery n'est PAS standard → utiliser measure_battery avec seuil
  'alarm_battery': {
    replacement: null, // Retirer, utiliser measure_battery
    alternative: 'measure_battery',
    note: 'Utiliser measure_battery avec flow cards "battery below X%"',
  },
  
  // Autres capabilities non standard
  'alarm_heat': {
    replacement: 'alarm_generic',
    alternative: 'alarm_generic',
    note: 'Utiliser alarm_generic avec title personnalisé',
  },
  
  'alarm_night': {
    replacement: null,
    alternative: null,
    note: 'Non supporté, retirer',
  },
  
  'measure_formaldehyde': {
    replacement: null,
    alternative: 'measure_co2',
    note: 'Non supporté, utiliser measure_co2 comme approximation',
  },
  
  'measure_voc': {
    replacement: null,
    alternative: 'measure_co2',
    note: 'Non supporté, utiliser measure_co2 comme approximation',
  },
};

/**
 * Vérifie si capability est standard
 */
function isStandardCapability(capability) {
  // Remove sub-capabilities (ex: onoff.switch_2)
  const baseCap = capability.split('.')[0];
  return STANDARD_CAPABILITIES.includes(baseCap);
}

/**
 * Trouve remplacement pour capability non standard
 */
function findReplacement(capability) {
  return CAPABILITY_REPLACEMENTS[capability] || null;
}

/**
 * Analyse un driver
 */
function analyzeDriver(driverId) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return null;
  }
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (!driver.capabilities) {
      return null;
    }
    
    const issues = [];
    const fixes = [];
    
    for (const capability of driver.capabilities) {
      const baseCap = capability.split('.')[0];
      
      if (!isStandardCapability(capability)) {
        const replacement = findReplacement(baseCap);
        
        issues.push({
          capability,
          baseCap,
          replacement,
        });
        
        if (replacement) {
          fixes.push({
            from: capability,
            to: replacement.replacement || replacement.alternative,
            note: replacement.note,
          });
        }
      }
    }
    
    if (issues.length > 0) {
      return {
        driverId,
        issues,
        fixes,
        driver,
        composePath,
      };
    }
    
    return null;
    
  } catch (err) {
    console.error(`Error analyzing ${driverId}:`, err.message);
    return null;
  }
}

/**
 * Applique les corrections
 */
function fixDriver(analysis) {
  if (!analysis || analysis.fixes.length === 0) {
    return false;
  }
  
  const { driver, composePath, fixes } = analysis;
  let modified = false;
  
  // Retirer alarm_battery et autres non supportées
  driver.capabilities = driver.capabilities.filter(cap => {
    const baseCap = cap.split('.')[0];
    
    // Retirer alarm_battery
    if (baseCap === 'alarm_battery') {
      modified = true;
      return false;
    }
    
    // Retirer autres non supportées sans replacement
    const replacement = findReplacement(baseCap);
    if (replacement && !replacement.replacement && !replacement.alternative) {
      modified = true;
      return false;
    }
    
    return true;
  });
  
  // Remplacer capabilities avec alternative
  driver.capabilities = driver.capabilities.map(cap => {
    const baseCap = cap.split('.')[0];
    const replacement = findReplacement(baseCap);
    
    if (replacement && replacement.replacement) {
      modified = true;
      return replacement.replacement;
    }
    
    return cap;
  });
  
  // S'assurer que measure_battery existe si alarm_battery était présent
  const hadAlarmBattery = analysis.issues.some(i => i.baseCap === 'alarm_battery');
  if (hadAlarmBattery && !driver.capabilities.includes('measure_battery')) {
    driver.capabilities.push('measure_battery');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Main process
 */
function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        🔍 CHECK & FIX CAPABILITIES SDK3                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() &&
    !d.startsWith('.') &&
    !d.includes('archived')
  );
  
  console.log(`📊 Analyzing ${drivers.length} drivers...\n`);
  
  const issues = [];
  const fixed = [];
  
  for (const driverId of drivers) {
    const analysis = analyzeDriver(driverId);
    
    if (analysis) {
      issues.push(analysis);
      
      console.log(`⚠️  ${driverId}:`);
      for (const issue of analysis.issues) {
        const rep = issue.replacement;
        if (rep) {
          if (rep.replacement) {
            console.log(`    ${issue.capability} → ${rep.replacement}`);
          } else if (rep.alternative) {
            console.log(`    ${issue.capability} → (remove, use ${rep.alternative})`);
          } else {
            console.log(`    ${issue.capability} → (remove)`);
          }
        }
      }
      
      // Appliquer corrections
      if (fixDriver(analysis)) {
        fixed.push(driverId);
        console.log(`    ✅ Fixed`);
      }
      
      console.log();
    }
  }
  
  // Summary
  console.log('═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`⚠️  Drivers with issues: ${issues.length}`);
  console.log(`✅ Drivers fixed: ${fixed.length}`);
  console.log(`✓ Drivers OK: ${drivers.length - issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🔍 ISSUES FOUND:');
    
    const capabilityCount = {};
    for (const issue of issues) {
      for (const cap of issue.issues) {
        const baseCap = cap.baseCap;
        capabilityCount[baseCap] = (capabilityCount[baseCap] || 0) + 1;
      }
    }
    
    console.log('\nNon-standard capabilities usage:');
    for (const [cap, count] of Object.entries(capabilityCount).sort((a, b) => b[1] - a[1])) {
      const rep = CAPABILITY_REPLACEMENTS[cap];
      console.log(`  ${cap}: ${count} drivers`);
      if (rep) {
        console.log(`    → ${rep.note}`);
      }
    }
  }
  
  console.log('\n✅ CHECK COMPLETE!\n');
}

main();
