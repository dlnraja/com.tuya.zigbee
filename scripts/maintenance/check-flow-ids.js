'use strict';

const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '..', '..', 'app.json');
const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

try {
  let appJson;
  if (!fs.existsSync(APP_JSON)) {
    console.warn(' app.json not found, attempting to build it first...');
    // If not found, it might be first run. But typically we want to check the SOURCE files if we're in CI.
  } else {
    appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  }

  // Actually, checking app.json is only useful AFTER 'homey app build'.
  // To prevent the build from failing, we should check all driver.flow.compose.json files.
  
  const triggers = new Map();
  const actions = new Map();
  const conditions = new Map();
  
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  let collisions = 0;
  
  for (const drv of dirs) {
    const flowPath = path.join(DRIVERS_DIR, drv, 'driver.flow.compose.json');
    if (!fs.existsSync(flowPath)) continue;
    
    const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
    
    // Check Triggers
    if (flow.triggers) {
      flow.triggers.forEach(t => {
        if (triggers.has(t.id)) {
          console.error(` Duplicate Trigger ID: "${t.id}" found in "${drv}" and "${triggers.get(t.id)}"`);
          collisions++;
        }
        triggers.set(t.id, drv);
      });
    }
    
    // Check Actions
    if (flow.actions) {
      flow.actions.forEach(a => {
        if (actions.has(a.id)) {
          console.error(` Duplicate Action ID: "${a.id}" found in "${drv}" and "${actions.get(a.id)}"`);
          collisions++;
        }
        actions.set(a.id, drv);
      });
    }

    // Check Conditions
    if (flow.conditions) {
      flow.conditions.forEach(c => {
        if (conditions.has(c.id)) {
          console.error(` Duplicate Condition ID: "${c.id}" found in "${drv}" and "${conditions.get(c.id)}"`);
          collisions++;
        }
        conditions.set(c.id, drv);
      });
    }
  }

  if (collisions > 0) {
    console.error(`\n FOUND ${collisions} FLOW CARD ID COLLISIONS! Build will fail.`);
    console.error(`Recommendation: Ensure all driver-specific flow cards are prefixed with the driver ID.`);
    process.exit(1);
  } else {
    console.log(' All Flow card IDs are unique across drivers.');
  }

} catch (err) {
  console.error('Error during Flow ID check:', err.message);
  process.exit(1);
}
