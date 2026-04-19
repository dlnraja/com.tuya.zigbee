#!/usr/bin/env node
'use strict';

/**
 * audit-flow-migration.js - v1.0.0
 * 
 * Verifies that all entries in DRIVER_ALIAS_MAP point to existing drivers.
 * Helps prevent orphan legacy flow card links.
 */

const fs = require('fs');
const path = require('path');
const { DRIVER_ALIAS_MAP } = require('../../lib/utils/migration-queue');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function audit() {
  console.log('===  Flow Migration & Alias Audit ===');
  
  const existingDrivers = fs.readdirSync(DRIVERS_DIR);
  let errors = 0;
  let orphans = 0;

  for (const [alias, target] of Object.entries(DRIVER_ALIAS_MAP)) {
    if (!existingDrivers.includes(target)) {
      console.error(` [ALIAS] "${alias}" points to non-existent driver "${target}"`);
      errors++;
    } else {
      // Check if driver.compose.json matches target
      const composePath = path.join(DRIVERS_DIR, target, 'driver.compose.json');
      if (!fs.existsSync(composePath)) {
        console.warn(` [ALIAS] target driver "${target}" missing driver.compose.json`);
      }
    }
    
    // Check if alias itself is an existing driver (might be redundant or intentional)
    if (existingDrivers.includes(alias) && alias !== target) {
      console.log(` [ALIAS] "${alias}" is an actual driver AND an alias to "${target}"`);
    }
  }

  console.log('\n--- Migration Audit Result ---');
  console.log(`Aliased drivers checked: ${Object.keys(DRIVER_ALIAS_MAP).length}`);
  console.log(`Invalid targets: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
