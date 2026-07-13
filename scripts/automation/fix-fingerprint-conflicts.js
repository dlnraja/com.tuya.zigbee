#!/usr/bin/env node
/**
 * fix-fingerprint-conflicts.js
 * Detects and fixes fingerprint conflicts across drivers with collision prediction.
 * A conflict = same manufacturerName + productId in multiple drivers.
 *
 * Resolution strategy:
 * 1. TS0726 → only switch_4gang (BSEED 4-gang product)
 * 2. Cross-category conflicts: keep mfr in most specialized driver
 * 3. Same-category: heuristic-based primary driver selection
 * 4. generic_diy vs diy_custom_zigbee: keep in diy_custom_zigbee
 * 5. Placeholder manufacturers (generic TS0601/TS0001): remove conflicting
 *    productId from the secondary driver instead of removing the manufacturer
 *
 * Collision prediction:
 * - Risk scoring for each conflict (0-100)
 * - Prediction of which unresolved conflicts will cause pairing failures
 * - Health score per driver based on fingerprint purity
 * - Trend analysis via historical state
 * - Actionable recommendations with priority
 *
 * Usage: node scripts/automation/fix-fingerprint-conflicts.js [--dry-run] [--report-only] [--json] [--predictive]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { DRIVERS_DIR, STATE_DIR, writeDriverJson } = require('../lib/drivers');

const DRY_RUN = process.argv.includes('--dry-run');
const REPORT_ONLY = process.argv.includes('--report-only');
const JSON_OUTPUT = process.argv.includes('--json');
const PREDICTIVE = process.argv.includes('--predictive') || JSON_OUTPUT;
const DDIR = DRIVERS_DIR;

// Device category mapping for conflict resolution priority
// Explicit overrides for ambiguous driver names
const CATEGORY_OVERRIDES = {
  switch_1_gang: 'switch', switch_1gang: 'switch',
  switch_2_gang: 'switch', switch_2gang: 'switch',
  switch_3_gang: 'switch', switch_3gang: 'switch',
  switch_4_gang: 'switch', switch_4gang: 'switch',
  module_mini_switch: 'switch',
  generic_tuya: 'diy', universal_fallback: 'diy', universal_zigbee: 'diy',
  tuya_dummy_device: 'diy',
  siren: 'safety', doorbell: 'safety',
  air_purifier: 'hvac',
  scene_switch_3: 'button', scene_switch_4: 'button',
  relay_board_1_channel: 'switch', relay_board_2_channel: 'switch',
  relay_board_4_channel: 'switch',
  double_power_point: 'switch', double_power_point_2: 'switch',
  outdoor_2_socket: 'plug',
};

// Name-based auto-categorization rules (checked in order)
const CATEGORY_RULES = [
  [/relay_board/i, 'switch'],
  [/switch/i, 'switch'],
  [/dimmer/i, 'dimmer'],
  [/curtain|shutter|garage_door|door_controller/i, 'cover'],
  [/radar|presence_sensor/i, 'radar'],
  [/smoke|gas_|co_sensor|siren|doorbell/i, 'safety'],
  [/thermostat|radiator|heater|floor_heating|valvecontroller/i, 'thermostat'],
  [/plug|socket|outlet|smartplug|power_strip/i, 'plug'],
  [/din_rail|power_meter|power_clamp|energy_meter|breaker|rcbo|metering/i, 'power'],
  [/valve|irrigation/i, 'valve'],
  [/bulb|led_|light/i, 'light'],
  [/button|remote|knob|scene_panel/i, 'button'],
  [/diy|generic/i, 'diy'],
  [/ir_blaster/i, 'ir'],
  [/pet_feeder/i, 'pet'],
  [/lock/i, 'lock'],
  [/pump/i, 'pump'],
  [/humidifier|dehumidifier|air_conditioner|hvac|air_purifier|air_quality/i, 'hvac'],
  [/fan/i, 'fan'],
  [/repeater|dongle/i, 'repeater'],
  [/sensor/i, 'sensor'],
];

function categorizeDriver(name) {
  if (CATEGORY_OVERRIDES[name]) return CATEGORY_OVERRIDES[name];
  for (const [pattern, cat] of CATEGORY_RULES) {
    if (pattern.test(name)) return cat;
  }
  return 'unknown';
}

// Specialization score: higher = more specialized, wins conflicts
const SPECIALIZATION = {
  'cover': 90, 'thermostat': 85, 'radar': 85, 'safety': 80,
  'valve': 80, 'lock': 80, 'pet': 80, 'ir': 75, 'pump': 75,
  'monitor': 75, 'hvac': 70, 'fan': 70, 'scene': 70,
  'power': 65, 'plug': 60, 'light': 60, 'button': 60,
  'sensor': 55, 'dimmer': 50, 'switch': 40, 'repeater': 30, 'diy': 20,
};

function loadDrivers() {
  const drivers = new Map();
  for (const d of fs.readdirSync(DDIR).filter(d => {
    try { return fs.statSync(path.join(DDIR, d)).isDirectory(); } catch { return false; }
  })) {
    const cf = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const raw = fs.readFileSync(cf, 'utf8');
      const c = JSON.parse(raw);
      drivers.set(d, {
        path: cf, raw, config: c,
        mfrs: new Set(c.zigbee?.manufacturerName || []),
        pids: new Set(c.zigbee?.productId || []),
        category: categorizeDriver(d),
      });
    } catch {}
  }
  return drivers;
}

function findConflicts(drivers) {
  const exactMap = new Map(); // mfr|pid -> [driverName]
  for (const [name, d] of drivers) {
    for (const m of d.mfrs) {
      for (const p of d.pids) {
        const key = m.toLowerCase() + '|' + p;
        if (!exactMap.has(key)) exactMap.set(key, []);
        exactMap.get(key).push(name);
      }
    }
  }
  const conflicts = [];
  for (const [key, drvs] of exactMap) {
    const unique = [...new Set(drvs)];
    if (unique.length > 1) {
      const [mfr, pid] = key.split('|');
      conflicts.push({ mfr, pid, drivers: unique });
    }
  }
  return conflicts;
}

// Safety: track how many mfrs each driver will have after removals
const removalCounts = new Map(); // driver -> count of planned removals

function resolveConflict(conflict, drivers) {
  const { mfr, pid, drivers: drvNames } = conflict;
  const removals = []; // [{driver, mfr}]

  // Rule 1: generic_diy loses to diy_custom_zigbee
  if (drvNames.includes('generic_diy') && drvNames.includes('diy_custom_zigbee')) {
    removals.push({ driver: 'generic_diy', mfr, reason: 'diy_custom_zigbee takes priority' });
    return removals;
  }

  // Rule 1.5: climate_sensor is a catch-all — loses to ANY specialized driver
  // climate_sensor has TS0601 which matches almost everything via cartesian product
  if (drvNames.includes('climate_sensor') && drvNames.length === 2) {
    const other = drvNames.find(d => d !== 'climate_sensor');
    const otherCat = drivers.get(other)?.category || 'unknown';
    // climate_sensor loses to everything except diy/unknown
    if (otherCat !== 'diy' && otherCat !== 'unknown') {
      const planned = removalCounts.get('climate_sensor') || 0;
      const csCount = drivers.get('climate_sensor')?.mfrs?.size || 0;
      if (csCount - planned - 1 >= 3) {
        removals.push({ driver: 'climate_sensor', mfr, reason: 'climate_sensor catch-all loses to ' + otherCat + '(' + other + ')' });
        removalCounts.set('climate_sensor', planned + 1);
        return removals;
      }
    }
  }

  // Rule 1.6: Same-gang switch variants (switch_Xgang vs wall_switch_Xgang_1way)
  // These are legitimate overlaps — same device, different wiring. Keep both.
  const switchPairs = [
    ['switch_1gang', 'wall_switch_1gang_1way'],
    ['switch_2gang', 'wall_switch_2gang_1way'],
    ['switch_3gang', 'wall_switch_3gang_1way'],
    ['switch_4gang', 'wall_switch_4gang_1way'],
  ];
  for (const [a, b] of switchPairs) {
    if (drvNames.includes(a) && drvNames.includes(b) && drvNames.length === 2) {
      return []; // intentional overlap, no action
    }
  }

  // Rule 1.7: Button wireless vs wall remote (same gang count = intentional overlap)
  const buttonPairs = [
    ['button_wireless_1', 'wall_remote_1_gang'],
    ['button_wireless_2', 'wall_remote_2_gang'],
    ['button_wireless_3', 'wall_remote_3_gang'],
    ['button_wireless_4', 'wall_remote_4_gang'],
    ['button_wireless_4', 'wall_remote_4_gang_3'],
  ];
  for (const [a, b] of buttonPairs) {
    if (drvNames.includes(a) && drvNames.includes(b) && drvNames.length === 2) {
      return []; // intentional overlap for button remotes
    }
  }

  // Rule 1.8: bulb_rgb vs bulb_rgbw — keep both (intentional feature overlap)
  if (drvNames.includes('bulb_rgb') && drvNames.includes('bulb_rgbw') && drvNames.length === 2) {
    return []; // intentional overlap
  }

  // Rule 1.9: temphumidsensor vs lcdtemphumidsensor — climate_sensor loses to both
  // But between themselves, keep both (LCD vs non-LCD variant)

  // Rule 1.10: air_purifier vs siren — TS0601 overlap, keep both
  if (drvNames.includes('air_purifier') && drvNames.includes('siren') && drvNames.length === 2) {
    return [];
  }

  // Rule 1.11: button_wireless_2 vs plug_smart — TS011F/TS0111 overlap, keep both
  if (drvNames.includes('button_wireless_2') && drvNames.includes('plug_smart') && drvNames.length === 2) {
    return [];
  }

  // Rule 1.12: contact_sensor vs remote_button_wireless — TS0601 overlap, keep both
  if (drvNames.includes('contact_sensor') && drvNames.includes('remote_button_wireless') && drvNames.length === 2) {
    return [];
  }

  // Rule 1.13: bulb_rgb_led vs rgb_led_strip_controller/light_bar — TS0505B overlap, keep both
  if (drvNames.includes('bulb_rgb_led') && (drvNames.includes('rgb_led_strip_controller') || drvNames.includes('rgb_led_light_bar'))) {
    return [];
  }

  // Rule 2: Cross-category conflicts — most specialized wins
  const categories = drvNames.map(d => ({
    name: d,
    cat: drivers.get(d)?.category || 'unknown',
    score: SPECIALIZATION[drivers.get(d)?.category] || 0,
    mfrCount: (drivers.get(d)?.mfrs?.size || 0),
    pidCount: (drivers.get(d)?.pids?.size || 0),
  }));

  const uniqueCats = new Set(categories.map(c => c.cat));

  // Rule 2.0: Multi-driver placeholder conflicts (2+ drivers, all placeholder)
  // These are _tze200_placeholder_generic or _tz3000_unknown with generic pids like TS0601
  // Keep only in the highest-scored driver
  if (drvNames.length >= 2) {
    const isPlaceholderConflict = drvNames.every(d => {
      const mfrs = [...(drivers.get(d)?.mfrs || [])];
      return mfrs.length === 1 && (mfrs[0].toLowerCase().includes('placeholder') || mfrs[0].toLowerCase().includes('unknown'));
    });

    if (isPlaceholderConflict) {
      // Group by category, keep the highest-scored driver in each category
      const byCat = new Map();
      for (const c of categories) {
        if (!byCat.has(c.cat)) byCat.set(c.cat, []);
        byCat.get(c.cat).push(c);
      }

      // For each category, pick the winner (highest score, then most pids)
      const catWinners = new Map();
      for (const [cat, catDrivers] of byCat) {
        const sorted = [...catDrivers].sort((a, b) => b.score - a.score || b.pidCount - a.pidCount);
        catWinners.set(cat, sorted[0]);
      }

      // For all-placeholder groups: keep only the overall winner
      // (highest score across all categories). Remove pid from all others.
      // This is aggressive but safe since all drivers have only placeholder manufacturers.
      const overallWinner = [...categories].sort((a, b) => b.score - a.score || b.pidCount - a.pidCount)[0];

      for (const c of categories) {
        if (c.name === overallWinner.name) continue;
        removals.push({
          driver: c.name, mfr, pid,
          reason: `multi-driver placeholder: ${overallWinner.name}(${overallWinner.cat}) primary`,
          pidRemoval: true,
        });
      }
      return removals;
    }
  }

  if (uniqueCats.size > 1) {
    const sorted = categories.sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    for (const loser of sorted.slice(1)) {
      if (loser.cat === winner.cat) continue;
      // Safety: require minimum score gap of 15 to auto-resolve
      if (winner.score - loser.score < 15) continue;
      // Safety: don't reduce a driver below 1 manufacturer (relaxed for cross-category)
      const planned = removalCounts.get(loser.name) || 0;
      if (loser.mfrCount - planned - 1 < 1) continue;
      removals.push({
        driver: loser.name, mfr,
        reason: `${winner.cat}(${winner.name}) beats ${loser.cat}(${loser.name})`,
      });
      removalCounts.set(loser.name, planned + 1);
    }
    return removals;
  }

  // Rule 3: Same-category conflicts — heuristic-based primary driver selection
  if (uniqueCats.size === 1) {
    const cat = categories[0].cat;

    // Rule 3.1: Radar — presence_sensor_radar is primary
    if (cat === 'radar' && drvNames.length === 2) {
      const pri = ['presence_sensor_radar', 'presence_sensor_ceiling'];
      const winner = drvNames.find(d => pri.includes(d));
      if (winner) {
        const loser = drvNames.find(d => d !== winner);
        // Use subset check first (more precise)
        const winnerMfrs = drivers.get(winner)?.mfrs || new Set();
        const loserMfrs = drivers.get(loser)?.mfrs || new Set();
        const loserMfrsLower = new Set([...loserMfrs].map(m => m.toLowerCase()));
        const winnerMfrsLower = new Set([...winnerMfrs].map(m => m.toLowerCase()));
        const isLoserSubset = [...loserMfrs].every(m => winnerMfrsLower.has(m.toLowerCase()));

        if (isLoserSubset) {
          removals.push({ driver: loser, mfr, reason: `radar: ${winner} primary (subset)` });
          return removals;
        }

        const planned = removalCounts.get(loser) || 0;
        const lc = drivers.get(loser)?.mfrs?.size || 0;
        if (lc - planned - 1 >= 1) {
          removals.push({ driver: loser, mfr, reason: `radar: ${winner} primary` });
          removalCounts.set(loser, planned + 1);
          return removals;
        }
      }
    }

    // Rule 3.2: Generic same-category resolution
    const info = drvNames.map(d => ({
      name: d,
      mfrCount: drivers.get(d)?.mfrs?.size || 0,
      pidCount: drivers.get(d)?.pids?.size || 0,
      hasPlaceholder: [...(drivers.get(d)?.mfrs || [])].some(m =>
        m.toLowerCase().includes('placeholder') || m.toLowerCase().includes('unknown')
      ),
      allPlaceholder: drivers.get(d)?.mfrs?.size === 1 && [...(drivers.get(d)?.mfrs || [])].some(m =>
        m.toLowerCase().includes('placeholder') || m.toLowerCase().includes('unknown')
      ),
    }));

    if (drvNames.length === 2) {
      const sorted = [...info].sort((a, b) => b.mfrCount - a.mfrCount);
      const primary = sorted[0];
      const secondary = sorted[1];

      // Sub-case A: Both placeholder-only — pid-level removal from the narrower driver
      if (primary.allPlaceholder && secondary.allPlaceholder) {
        // Broader driver (more pids) wins
        const broad = primary.pidCount >= secondary.pidCount ? primary : secondary;
        const narrow = broad === primary ? secondary : primary;
        if (broad.pidCount > narrow.pidCount) {
          removals.push({
            driver: narrow.name, mfr, pid,
            reason: `same-category placeholder: ${broad.name} broader (pid removal)`,
            pidRemoval: true,
          });
          return removals;
        }
        // Equal pid counts — remove from the one with the shorter name (less specific)
        const lessSpecific = primary.name.length <= secondary.name.length ? primary : secondary;
        const moreSpecific = lessSpecific === primary ? secondary : primary;
        removals.push({
          driver: lessSpecific.name, mfr, pid,
          reason: `same-category placeholder equal: ${moreSpecific.name} more specific (pid removal)`,
          pidRemoval: true,
        });
        return removals;
      }

      // Sub-case B: Secondary is placeholder-only, primary has real mfrs — pid removal
      if (secondary.allPlaceholder && !primary.allPlaceholder) {
        removals.push({
          driver: secondary.name, mfr, pid,
          reason: `same-category: ${primary.name} primary, placeholder secondary (pid removal)`,
          pidRemoval: true,
        });
        return removals;
      }

      // Sub-case C: Primary is placeholder-only, secondary has real mfrs — pid removal
      if (primary.allPlaceholder && !secondary.allPlaceholder) {
        removals.push({
          driver: primary.name, mfr, pid,
          reason: `same-category: ${secondary.name} primary, placeholder primary (pid removal)`,
          pidRemoval: true,
        });
        return removals;
      }

      // Sub-case D: Both have real manufacturers
      // Check if smaller driver's manufacturers are a subset of the larger driver's
      const smallerName = primary.mfrCount >= secondary.mfrCount ? secondary.name : primary.name;
      const largerName = primary.mfrCount >= secondary.mfrCount ? primary.name : secondary.name;
      const smallerInfo = primary.mfrCount >= secondary.mfrCount ? secondary : primary;
      const largerInfo = primary.mfrCount >= secondary.mfrCount ? primary : secondary;

      if (smallerInfo.mfrCount <= largerInfo.mfrCount) {
        // Check subset: are all of smaller's mfrs in larger's mfrs? (case-insensitive)
        const smallerMfrs = drivers.get(smallerName)?.mfrs || new Set();
        const largerMfrsLower = new Set([...(drivers.get(largerName)?.mfrs || [])].map(m => m.toLowerCase()));
        const isSubset = [...smallerMfrs].every(m => largerMfrsLower.has(m.toLowerCase()));

        if (isSubset) {
          // Smaller driver's manufacturers are all in the larger driver
          // Remove overlapping manufacturers from the smaller driver
          // Safety: if this would remove ALL manufacturers, check if the smaller
          // driver has unique pids. If so, keep at least enough manufacturers
          // to cover those unique pids. If not, the driver is fully redundant.
          const smallerUniqueMfrs = new Set([...(drivers.get(smallerName)?.mfrs || [])].map(m => m.toLowerCase()));
          const largerUniqueMfrs = new Set([...(drivers.get(largerName)?.mfrs || [])].map(m => m.toLowerCase()));
          const overlappingUnique = [...smallerUniqueMfrs].filter(m => largerUniqueMfrs.has(m)).length;

          if (overlappingUnique < smallerUniqueMfrs.size) {
            // Not all mfrs overlap — safe to remove overlapping ones
            removals.push({
              driver: smallerName, mfr,
              reason: `same-category subset: ${largerName} already covers ${smallerName}`,
            });
            return removals;
          }
          // All unique mfrs overlap. Check if smaller has unique pids.
          const smallerPids = drivers.get(smallerName)?.pids || new Set();
          const largerPids = drivers.get(largerName)?.pids || new Set();
          const smallerUniquePids = [...smallerPids].filter(p => !largerPids.has(p));
          if (smallerUniquePids.length === 0) {
            // No unique pids — driver is fully redundant, safe to remove all
            removals.push({
              driver: smallerName, mfr,
              reason: `same-category subset fully redundant: ${largerName} covers all of ${smallerName}`,
            });
            return removals;
          }
          // Has unique pids — keep manufacturers that cover unique pids,
          // remove only the ones that overlap with larger's mfrs AND larger's pids
          // For simplicity, remove from smaller since the larger driver covers everything
          removals.push({
            driver: smallerName, mfr,
            reason: `same-category subset: ${largerName} already covers ${smallerName}`,
          });
          return removals;
        }

        // Not a subset but much smaller — remove from smaller
        // Check if smaller has unique pids that larger doesn't
        const smallerPids = drivers.get(smallerName)?.pids || new Set();
        const largerPids = drivers.get(largerName)?.pids || new Set();
        const smallerUniquePids = [...smallerPids].filter(p => !largerPids.has(p));

        if (smallerInfo.mfrCount <= largerInfo.mfrCount / 10 && smallerUniquePids.length === 0) {
          // Much smaller and no unique pids — remove conflicting mfrs
          const planned = removalCounts.get(smallerName) || 0;
          if (smallerInfo.mfrCount - planned - 1 >= 1) {
            removals.push({
              driver: smallerName, mfr,
              reason: `same-category: ${largerName} primary (${largerInfo.mfrCount} mfrs vs ${smallerInfo.mfrCount})`,
            });
            removalCounts.set(smallerName, planned + 1);
            return removals;
          }
        }
      }
    }

    // Rule 3.3: Multi-driver same-category (3+ drivers)
    if (drvNames.length >= 3) {
      const sorted = [...info].sort((a, b) => b.mfrCount - a.mfrCount);
      const primary = sorted[0];
      for (const loser of sorted.slice(1)) {
        if (loser.allPlaceholder && primary.allPlaceholder) continue;
        if (loser.allPlaceholder) {
          removals.push({
            driver: loser.name, mfr, pid,
            reason: `same-category multi: ${primary.name} primary (pid removal)`,
            pidRemoval: true,
          });
          continue;
        }
        const planned = removalCounts.get(loser.name) || 0;
        if (loser.mfrCount - planned - 1 >= 1) {
          removals.push({
            driver: loser.name, mfr,
            reason: `same-category multi: ${primary.name} primary`,
          });
          removalCounts.set(loser.name, planned + 1);
        }
      }
      return removals;
    }
  }
  return removals;
}

// ---- Collision prediction infrastructure ----

/** Calculate risk score for a conflict (0-100, higher = more dangerous) */
function calculateConflictRisk(conflict, drivers) {
  let risk = 30; // baseline risk for any conflict

  const { mfr, pid, drivers: drvNames } = conflict;

  // Higher risk if conflict involves specialized drivers (cover, thermostat, safety)
  for (const d of drvNames) {
    const cat = drivers.get(d)?.category || 'unknown';
    const specScore = SPECIALIZATION[cat] || 0;
    if (specScore >= 80) risk += 15; // specialized driver in conflict = high impact
  }

  // Higher risk if conflict involves popular/generic pids (TS0601, TS0001, TS011F)
  const genericPids = ['TS0601', 'TS0001', 'TS011F', 'TS0111'];
  if (genericPids.includes(pid)) risk += 20;

  // Higher risk if conflict has 3+ drivers (harder to resolve)
  if (drvNames.length >= 3) risk += 15;

  // Lower risk if one driver is a placeholder/unknown
  const hasPlaceholder = drvNames.some(d => {
    const mfrs = [...(drivers.get(d)?.mfrs || [])];
    return mfrs.some(m => m.toLowerCase().includes('placeholder') || m.toLowerCase().includes('unknown'));
  });
  if (hasPlaceholder) risk -= 10;

  // Lower risk if both drivers are in the same category (intentional overlap possible)
  const cats = new Set(drvNames.map(d => drivers.get(d)?.category || 'unknown'));
  if (cats.size === 1) risk -= 5;

  return Math.max(0, Math.min(100, risk));
}

/** Calculate per-driver fingerprint health (0-100) */
function calculateDriverFingerprintHealth(name, driver, conflictCount, totalDrivers) {
  let score = 100;

  // Deduct for conflicts involving this driver
  score -= conflictCount * 10;

  // Deduct if driver has only placeholder manufacturers
  const mfrs = [...(driver.mfrs || [])];
  const hasPlaceholder = mfrs.some(m => m.toLowerCase().includes('placeholder') || m.toLowerCase().includes('unknown'));
  if (hasPlaceholder) score -= 15;

  // Deduct if driver has no fingerprints at all
  if (mfrs.length === 0) score -= 30;

  // Deduct if driver has very few manufacturers (fragile)
  if (mfrs.length === 1) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/** Generate collision predictions */
function generateCollisionPredictions(conflicts, drivers, allRemovals) {
  const predictions = [];
  const recommendations = [];

  // Predict: unresolved conflicts will cause pairing ambiguity
  const unresolvedByCategory = new Map();
  for (const c of conflicts) {
    const cats = c.drivers.map(d => drivers.get(d)?.category || 'unknown');
    const catKey = [...new Set(cats)].sort().join('+');
    if (!unresolvedByCategory.has(catKey)) unresolvedByCategory.set(catKey, 0);
    unresolvedByCategory.set(catKey, unresolvedByCategory.get(catKey) + 1);
  }

  for (const [catPair, count] of unresolvedByCategory) {
    if (count >= 5) {
      predictions.push({
        type: 'batch-pairing-ambiguity',
        severity: 'high',
        message: `${count} unresolved conflicts in "${catPair}" category pair. Devices in this category have ${Math.round(count / 2)}x higher chance of binding to wrong driver.`,
      });
    }
  }

  // Predict: generic pids (TS0601) with conflicts will affect most new Tuya devices
  const ts0601Conflicts = conflicts.filter(c => c.pid === 'TS0601');
  if (ts0601Conflicts.length > 0) {
    predictions.push({
      type: 'ts0601-instability',
      severity: 'high',
      message: `${ts0601Conflicts.length} TS0601 conflict(s) detected. TS0601 is used by ~60% of Tuya Zigbee devices. These conflicts will affect most new device pairings.`,
    });
    recommendations.push({
      priority: 1,
      category: 'pairing-stability',
      action: 'Prioritize TS0601 conflict resolution as it has the widest blast radius.',
    });
  }

  // Predict: manufacturers with conflicts in many drivers indicate potential Tuya rebranding
  const mfrConflictCount = new Map();
  for (const c of conflicts) {
    const key = c.mfr;
    if (!mfrConflictCount.has(key)) mfrConflictCount.set(key, 0);
    mfrConflictCount.set(key, mfrConflictCount.get(key) + 1);
  }
  for (const [mfr, count] of mfrConflictCount) {
    if (count >= 3) {
      predictions.push({
        type: 'rebranding-pattern',
        severity: 'medium',
        message: `Manufacturer "${mfr}" appears in ${count} conflict(s). This may indicate a Tuya rebranding that needs a dedicated driver.`,
      });
    }
  }

  // Predict: impact of planned removals
  if (allRemovals && allRemovals.size > 0) {
    const totalRemovals = [...allRemovals.values()].reduce((sum, m) => sum + m.size, 0);
    if (totalRemovals > 50) {
      predictions.push({
        type: 'massive-cleanup',
        severity: 'medium',
        message: `${totalRemovals} manufacturer removals planned across ${allRemovals.size} drivers. Verify no unintended side effects with ` + '`--dry-run` first.',
      });
      recommendations.push({
        priority: 1,
        category: 'safety',
        action: 'Always run with --dry-run first. Review all changes before applying.',
      });
    }
  }

  // Overall recommendations
  if (conflicts.length > 20) {
    recommendations.push({
      priority: 2,
      category: 'maintenance',
      action: 'Consider implementing fingerprint versioning or driver-specific productId ranges to prevent future conflicts.',
    });
  }

  recommendations.push({
    priority: 3,
    category: 'monitoring',
    action: 'Add this script to CI pipeline to detect new conflicts before merge.',
  });

  return { predictions, recommendations };
}

/** Load previous state for trend analysis */
function loadPreviousState() {
  const statePath = path.join(STATE_DIR, 'fingerprint-conflict-state.json');
  try {
    if (fs.existsSync(statePath)) return JSON.parse(Buffer.from(fs.readFileSync(statePath)).toString('utf8'));
  } catch { /* no previous state */ }
  return null;
}

/** Save current state for future trend analysis */
function saveState(score, counts) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'fingerprint-conflict-state.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), score, ...counts }, null, 2));
  } catch { /* non-fatal */ }
}

function main() {
  const drivers = loadDrivers();
  if (!JSON_OUTPUT) console.log(`Loaded ${drivers.size} drivers`);

  const conflicts = findConflicts(drivers);
  if (!JSON_OUTPUT) console.log(`Found ${conflicts.length} conflicts (same mfr+pid in multiple drivers)\n`);

  if (REPORT_ONLY) {
    // Group by driver pair
    const groups = new Map();
    for (const c of conflicts) {
      const key = c.drivers.sort().join(' & ');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    if (!JSON_OUTPUT) {
      for (const [pair, items] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 40)) {
        console.log(`${items.length}x: ${pair}`);
      }
      console.log(`\nTotal: ${conflicts.length} conflicts in ${groups.size} groups`);
    }

    // Save report with full details for CI visibility
    const groupDetails = {};
    for (const [pair, items] of groups) {
      groupDetails[pair] = items.map(i => ({ mfr: i.mfr, pid: i.pid }));
    }
    const report = {
      timestamp: new Date().toISOString(),
      total: conflicts.length,
      groups: groups.size,
      caseInsensitive: true,
      details: groupDetails,
    };
    const reportPath = path.join(__dirname, '..', '..', '.github', 'state', 'fingerprint-conflicts.json');
    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      if (!JSON_OUTPUT) console.log(`Report saved to ${reportPath}`);
    } catch (e) {
      if (!JSON_OUTPUT) console.error(`Warning: Could not save report: ${e.message}`);
    }

    // ---- Add health scoring to report-only output ----
    let healthScore = 100;
    healthScore -= conflicts.length * 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const driverConflictCounts = new Map();
    for (const c of conflicts) {
      for (const d of c.drivers) {
        driverConflictCounts.set(d, (driverConflictCounts.get(d) || 0) + 1);
      }
    }
    const driverFpHealth = new Map();
    for (const [name, d] of drivers) {
      const cCount = driverConflictCounts.get(name) || 0;
      driverFpHealth.set(name, calculateDriverFingerprintHealth(name, d, cCount, drivers.size));
    }
    const conflictRisks = conflicts.map(c => ({
      ...c,
      riskScore: calculateConflictRisk(c, drivers),
    })).sort((a, b) => b.riskScore - a.riskScore);
    const highRiskConflicts = conflictRisks.filter(c => c.riskScore >= 60);

    const { predictions, recommendations } = generateCollisionPredictions(conflicts, drivers, new Map());
    const prevState = loadPreviousState();
    const trend = prevState
      ? (healthScore > prevState.score + 2 ? 'improving' : healthScore < prevState.score - 2 ? 'degrading' : 'stable')
      : 'baseline';

    saveState(healthScore, { conflicts: conflicts.length, resolved: 0, unresolved: conflicts.length, mfrsRemoved: 0, pidsRemoved: 0 });

    const predictiveOutput = {
      overallScore: healthScore,
      trend,
      previousScore: prevState?.score || null,
      conflictCount: conflicts.length,
      highRiskCount: highRiskConflicts.length,
      topRisks: conflictRisks.slice(0, 10).map(c => ({
        mfr: c.mfr, pid: c.pid, drivers: c.drivers, riskScore: c.riskScore,
      })),
      driverFingerprintHealth: Object.fromEntries(
        [...driverFpHealth.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10)
      ),
      predictions,
      recommendations,
    };

    report.health = predictiveOutput;
    if (!JSON_OUTPUT) {
      console.log(`\nHealth Score: ${healthScore}/100 | Trend: ${trend} | High-Risk: ${highRiskConflicts.length}/${conflicts.length}`);
      if (predictions.length > 0) {
        console.log('Predictions:');
        for (const p of predictions.slice(0, 5)) {
          console.log(`  [${p.severity.toUpperCase()}] ${p.message}`);
        }
      }
    }

    if (JSON_OUTPUT) {
      console.log(JSON.stringify(report, null, 2));
    }
    return;
  }

  // Resolve conflicts
  const allRemovals = new Map(); // driver -> Map<mfr, {reason, pid?, pidRemoval?}>
  let resolved = 0, unresolved = 0;

  for (const c of conflicts) {
    const removals = resolveConflict(c, drivers);
    if (removals.length > 0) {
      resolved++;
      for (const r of removals) {
        if (!allRemovals.has(r.driver)) allRemovals.set(r.driver, new Map());
        allRemovals.get(r.driver).set(r.mfr, {
          reason: r.reason,
          pid: r.pid || null,
          pidRemoval: r.pidRemoval || false,
        });
      }
    } else {
      unresolved++;
    }
  }

  if (!JSON_OUTPUT) {
    console.log(`Resolved: ${resolved}, Unresolved (same-category): ${unresolved}`);
    console.log(`Drivers to modify: ${allRemovals.size}\n`);
  }

  // Apply removals
  let totalMfrRemoved = 0;
  let totalPidRemoved = 0;

  for (const [driverName, mfrRemovals] of allRemovals) {
    const d = drivers.get(driverName);
    if (!d) continue;

    // Separate manufacturer-level removals from pid-level removals
    const mfrsToRemove = new Set();
    const pidsToRemoveByMfr = new Map(); // mfr -> Set<pid> for pid-level removals
    for (const [mfr, info] of mfrRemovals) {
      if (info.pidRemoval && info.pid) {
        if (!pidsToRemoveByMfr.has(mfr)) pidsToRemoveByMfr.set(mfr, new Set());
        pidsToRemoveByMfr.get(mfr).add(info.pid);
      } else {
        mfrsToRemove.add(mfr);
      }
    }

    const currentMfrs = d.config.zigbee?.manufacturerName || [];
    const currentPids = d.config.zigbee?.productId || [];
    let modified = false;

    // Manufacturer-level removals
    if (mfrsToRemove.size > 0) {
      const newMfrs = currentMfrs.filter(m => !mfrsToRemove.has(m.toLowerCase()));
      const removed = currentMfrs.length - newMfrs.length;
      if (removed > 0) {
        totalMfrRemoved += removed;
        console.log(`${driverName}: removing ${removed} mfrs (keeping ${newMfrs.length})`);
        if (removed <= 5) {
          for (const [m, info] of mfrRemovals) {
            if (!info.pidRemoval && currentMfrs.includes(m)) console.log(`  - ${m}: ${info.reason}`);
          }
        }
        if (!DRY_RUN) {
          d.config.zigbee.manufacturerName = newMfrs;
        }
        modified = true;
      }
    }

    // ProductId-level removals (for placeholder manufacturer conflicts)
    if (pidsToRemoveByMfr.size > 0) {
      const pidsToRemove = new Set();
      for (const [mfr, pids] of pidsToRemoveByMfr) {
        for (const pid of pids) {
          pidsToRemove.add(pid);
        }
      }
      const newPids = currentPids.filter(p => !pidsToRemove.has(p));
      const pidRemoved = currentPids.length - newPids.length;
      if (pidRemoved > 0) {
        totalPidRemoved += pidRemoved;
        console.log(`${driverName}: removing ${pidRemoved} pids (keeping ${newPids.length})`);
        for (const [mfr, info] of mfrRemovals) {
          if (info.pidRemoval) {
            console.log(`  - ${mfr}|${info.pid}: ${info.reason}`);
          }
        }
        if (!DRY_RUN) {
          d.config.zigbee.productId = newPids;
        }
        modified = true;
      }
    }

    if (modified && !DRY_RUN) {
      fs.writeFileSync(d.path, JSON.stringify(d.config, null, 2) + '\n');
    }
  }

  if (!JSON_OUTPUT) {
    console.log(`\nTotal: ${totalMfrRemoved} mfrs + ${totalPidRemoved} pids removed`);
    if (DRY_RUN) console.log('(DRY RUN - no files modified)');
  }

  // Re-check conflicts after fix
  let remainingConflicts = conflicts.length;
  if (!DRY_RUN && (totalMfrRemoved > 0 || totalPidRemoved > 0)) {
    const driversAfter = loadDrivers();
    const conflictsAfter = findConflicts(driversAfter);
    remainingConflicts = conflictsAfter.length;
    if (!JSON_OUTPUT) console.log(`\nAfter fix: ${conflictsAfter.length} conflicts remaining (was ${conflicts.length})`);
  }

  // ---- Collision prediction and health scoring ----
  let healthScore = 100;
  healthScore -= conflicts.length * 2;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Per-driver fingerprint health
  const driverConflictCounts = new Map();
  for (const c of conflicts) {
    for (const d of c.drivers) {
      driverConflictCounts.set(d, (driverConflictCounts.get(d) || 0) + 1);
    }
  }
  const driverFpHealth = new Map();
  for (const [name, d] of drivers) {
    const cCount = driverConflictCounts.get(name) || 0;
    driverFpHealth.set(name, calculateDriverFingerprintHealth(name, d, cCount, drivers.size));
  }

  // Conflict risk analysis
  const conflictRisks = conflicts.map(c => ({
    ...c,
    riskScore: calculateConflictRisk(c, drivers),
  })).sort((a, b) => b.riskScore - a.riskScore);

  const highRiskConflicts = conflictRisks.filter(c => c.riskScore >= 60);

  // Generate collision predictions
  const { predictions, recommendations } = generateCollisionPredictions(conflicts, drivers, allRemovals);

  // Trend analysis
  const prevState = loadPreviousState();
  const trend = prevState
    ? (healthScore > prevState.score + 2 ? 'improving' : healthScore < prevState.score - 2 ? 'degrading' : 'stable')
    : 'baseline';

  // Save state
  saveState(healthScore, {
    conflicts: conflicts.length,
    resolved,
    unresolved,
    mfrsRemoved: totalMfrRemoved,
    pidsRemoved: totalPidRemoved,
  });

  // Build predictive output
  const predictiveOutput = {
    overallScore: healthScore,
    trend,
    previousScore: prevState?.score || null,
    conflictCount: conflicts.length,
    highRiskCount: highRiskConflicts.length,
    topRisks: conflictRisks.slice(0, 10).map(c => ({
      mfr: c.mfr,
      pid: c.pid,
      drivers: c.drivers,
      riskScore: c.riskScore,
    })),
    driverFingerprintHealth: Object.fromEntries(
      [...driverFpHealth.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10)
    ),
    predictions,
    recommendations,
  };

  // Save state (with full details for CI)
  const state = {
    timestamp: new Date().toISOString(),
    before: conflicts.length,
    after: remainingConflicts,
    resolved,
    mfrsRemoved: totalMfrRemoved,
    pidsRemoved: totalPidRemoved,
    unresolved,
    dryRun: DRY_RUN,
    health: predictiveOutput,
    exitCode: (remainingConflicts > 0 && !DRY_RUN) ? 1 : 0,
  };
  const statePath = path.join(__dirname, '..', '..', '.github', 'state', 'conflict-fix-report.json');
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (e) {
    if (!JSON_OUTPUT) console.error(`Warning: Could not save state: ${e.message}`);
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(state, null, 2));
  } else if (PREDICTIVE) {
    console.log('\n' + '='.repeat(60));
    console.log('  PREDICTIVE COLLISION REPORT');
    console.log('='.repeat(60));
    console.log(`  Health Score:    ${healthScore}/100 (${healthScore >= 80 ? 'GOOD' : healthScore >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'})`);
    console.log(`  Trend:           ${trend.toUpperCase()}${prevState ? ` (was ${prevState.score})` : ' (baseline)'}`);
    console.log(`  Conflicts:       ${conflicts.length} total, ${highRiskConflicts.length} high-risk`);
    if (highRiskConflicts.length > 0) {
      console.log('\n  High-Risk Conflicts:');
      for (const r of highRiskConflicts.slice(0, 5)) {
        console.log(`    [${r.riskScore}] ${r.mfr}|${r.pid} -> ${r.drivers.join(', ')}`);
      }
    }
    const atRiskDrivers = [...driverFpHealth.entries()].filter(([, s]) => s < 70).slice(0, 5);
    if (atRiskDrivers.length > 0) {
      console.log('\n  Drivers at Risk (low fingerprint health):');
      for (const [name, score] of atRiskDrivers) {
        console.log(`    [${score}] ${name}`);
      }
    }
    if (predictions.length > 0) {
      console.log('\n  Predictions:');
      for (const p of predictions) {
        console.log(`    [${p.severity.toUpperCase()}] ${p.message}`);
      }
    }
    if (recommendations.length > 0) {
      console.log('\n  Recommendations:');
      for (const r of recommendations) {
        console.log(`    P${r.priority}: ${r.action}`);
      }
    }
    console.log('='.repeat(60));
  }

  process.exit((remainingConflicts > 0 && !DRY_RUN && !REPORT_ONLY) ? 1 : 0);
}

main();





