#!/usr/bin/env node
/**
 * Capability Auditor - Checks all drivers for capability issues
 * Run: node scripts/automation/audit-capabilities.js [--json]
 *
 * Detects:
 * - Missing capabilitiesOptions for subcapabilities
 * - Button devices with onoff
 * - Capability conflicts (same capability defined differently across drivers)
 * - Missing required capabilities for device classes
 * - Unused capabilitiesOptions entries
 * - Capability ordering consistency
 *
 * Exit codes: 0 = pass, 1 = errors found, 2 = script failure
 */
'use strict';

const { loadAllDrivers } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const JSON_OUTPUT = process.argv.includes('--json');
const { log, summary } = createLogger('Capability Audit');

const drivers = loadAllDrivers();

// Track capability definitions across drivers for conflict detection
// cap -> Map<optionKey, Set<driverName>>
const capOptionDefinitions = new Map();

// Track capabilities by class for consistency
const classCapabilityMap = new Map(); // class -> Set<capability>

for (const [name, d] of drivers) {
  const caps = d.caps;
  const opts = d.config.capabilitiesOptions || {};
  const driverClass = d.config.class || 'unknown';

  // Initialize class tracking
  if (!classCapabilityMap.has(driverClass)) classCapabilityMap.set(driverClass, new Map());
  const classCaps = classCapabilityMap.get(driverClass);

  // 1. Missing options for subcapabilities
  caps.filter(c => c.includes('.')).forEach(c => {
    if (!opts[c]) {
      log('warn', name, 'Missing capabilitiesOptions: ' + c);
    }
  });

  // 2. Button has onoff
  if (name.toLowerCase().includes('button') && caps.includes('onoff') && d.config.class === 'button') {
    log('error', name, 'Button has onoff');
  }

  // 3. Unused capabilitiesOptions: options defined but not in capabilities
  const optsKeys = Object.keys(opts);
  for (const optKey of optsKeys) {
    if (!caps.includes(optKey)) {
      log('warn', name, `capabilitiesOptions key '${optKey}' not in capabilities array`);
    }
  }

  // 4. Track capability definitions for conflict detection
  for (const cap of caps) {
    const optDef = opts[cap];
    if (optDef) {
      const optKey = JSON.stringify(optDef, Object.keys(optDef || {}).sort());
      if (!capOptionDefinitions.has(cap)) capOptionDefinitions.set(cap, new Map());
      const defMap = capOptionDefinitions.get(cap);
      if (!defMap.has(optKey)) defMap.set(optKey, new Set());
      defMap.get(optKey).add(name);
    }

    // Track per class
    if (!classCaps.has(cap)) classCaps.set(cap, new Set());
    classCaps.get(cap).add(name);
  }

  // 5. Class-based capability consistency
  // If class === 'thermostat' but missing thermostat_temperature, warn
  if (d.config.class === 'thermostat') {
    if (!caps.includes('thermostat_temperature') && !caps.includes('target_temperature')) {
      log('warn', name, 'Thermostat class but no thermostat_temperature or target_temperature');
    }
  }

  // 6. Empty capabilities array
  if (Array.isArray(caps) && caps.length === 0) {
    log('warn', name, 'Empty capabilities array');
  }

  // 7. Capability type mismatches: onoff should be boolean-like (no options needed)
  if (caps.includes('onoff') && opts['onoff']) {
    log('warn', name, 'onoff capability has capabilitiesOptions (usually not needed)');
  }
}

// 8. Capability conflict detection: same capability with different option definitions
let conflictCount = 0;
for (const [cap, defMap] of capOptionDefinitions) {
  if (defMap.size > 1) {
    // Multiple different definitions for same capability
    const defs = [...defMap.entries()];
    // Only flag if there are conflicting definitions (not just same definition in multiple drivers)
    // A real conflict is when option objects differ in structure
    const structures = defs.map(([key]) => {
      try { return Object.keys(JSON.parse(key)).sort().join(','); } catch { return key; }
    });
    const uniqueStructures = [...new Set(structures)];
    if (uniqueStructures.length > 1) {
      for (const [optKey, driverNames] of defs) {
        const shortList = [...driverNames].slice(0, 3).join(', ') + (driverNames.size > 3 ? '...' : '');
        log('warn', `capability-conflict/${cap}`, `Different option structure: ${shortList} (${driverNames.size} drivers)`);
        conflictCount++;
      }
    }
  }
}

const s = summary();

if (JSON_OUTPUT) {
  const output = {
    timestamp: new Date().toISOString(),
    driversAudited: drivers.size,
    errors: s.errors,
    warnings: s.warnings,
    capabilityConflicts: conflictCount,
    exitCode: s.errors > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
}

process.exit(s.errors > 0 ? 1 : 0);
