'use strict';
/**
 * fix-driver-compose.js
 * Scans all driver.compose.json files for missing required fields (class, capabilities)
 * and infers sensible defaults from the driver ID / name.
 */
const fs = require('fs'), path = require('path');
process.chdir(path.join(__dirname, '..', '..', '..'));

// Map driver ID patterns → class + default capabilities
const INFER_RULES = [
  // Bulbs / lights
  { match: /bulb|spot|led_strip|downlight|ceiling|panel_light|flood|filament|candle|globe/, class: 'light', caps: ['onoff', 'dim'] },
  { match: /tunable|cct|colour|color|rgbw|rgb/, class: 'light', caps: ['onoff', 'dim', 'light_temperature'] },
  // Switches
  { match: /switch|relay|socket|plug|outlet/, class: 'socket', caps: ['onoff'] },
  { match: /din_rail/, class: 'socket', caps: ['onoff'] },
  // Sensors
  { match: /temperature|humidity|sensor|thermometer|hygro/, class: 'sensor', caps: ['measure_temperature', 'measure_humidity'] },
  { match: /motion|pir|presence/, class: 'sensor', caps: ['alarm_motion'] },
  { match: /contact|door|window/, class: 'sensor', caps: ['alarm_contact'] },
  { match: /smoke/, class: 'sensor', caps: ['alarm_smoke'] },
  { match: /co2|air_quality/, class: 'sensor', caps: ['measure_co2'] },
  { match: /water_leak|flood_sensor/, class: 'sensor', caps: ['alarm_water'] },
  { match: /soil/, class: 'sensor', caps: ['measure_humidity'] },
  // Thermostats
  { match: /thermostat|climate|hvac/, class: 'thermostat', caps: ['onoff', 'target_temperature', 'measure_temperature'] },
  // Curtains / blinds
  { match: /curtain|blind|shutter|roller/, class: 'windowcoverings', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  // Locks
  { match: /lock|door_lock/, class: 'lock', caps: ['locked'] },
  // Alarms / sirens
  { match: /siren|alarm/, class: 'other', caps: ['alarm_generic'] },
  // Valves
  { match: /valve|water_valve/, class: 'valve', caps: ['onoff'] },
  // Fans / purifiers
  { match: /fan|purifier/, class: 'fan', caps: ['onoff'] },
  // Dimmers
  { match: /dimmer/, class: 'light', caps: ['onoff', 'dim'] },
  // Generic fallback
  { match: /repeater|router/, class: 'other', caps: [] },
  { match: /dummy|generic|diy/, class: 'other', caps: [] },
];

function inferForId(id) {
  for (const rule of INFER_RULES) {
    if (rule.match.test(id)) {
      return { class: rule.class, capabilities: rule.caps };
    }
  }
  return { class: 'other', capabilities: ['onoff'] };
}

// Get errors from homey validate output (passed via stdin or read from file)
const driversDir = 'drivers';
const driverIds = fs.readdirSync(driversDir, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

let fixed = 0;
let skipped = 0;

for (const id of driverIds) {
  const composePath = path.join(driversDir, id, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;

  let dc;
  try {
    dc = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    console.log(`SKIP ${id}: invalid JSON`);
    skipped++;
    continue;
  }

  let changed = false;

  // Fix missing class
  if (!dc.class) {
    const inferred = inferForId(id);
    dc.class = inferred.class;
    console.log(`  FIX class for ${id}: → ${dc.class}`);
    changed = true;
  }

  // Fix missing capabilities
  if (!dc.capabilities || dc.capabilities.length === 0) {
    const inferred = inferForId(id);
    if (inferred.capabilities.length > 0) {
      dc.capabilities = inferred.capabilities;
      console.log(`  FIX capabilities for ${id}: → [${dc.capabilities.join(', ')}]`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(composePath, JSON.stringify(dc, null, 2), 'utf8');
    fixed++;
  }
}

console.log(`\nFixed ${fixed} drivers, skipped ${skipped}`);
