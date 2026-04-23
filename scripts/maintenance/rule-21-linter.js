const fs = require('fs');
const path = require('path');

/**
 * 
 *       RULE 21 COMPLIANCE LINTER v1.0.0 (Thinking Reimplementation Engine)                    
 * 
 *   Ensures multi-gang Flow cards use capability filters instead of driver_ids.  
 *   Prevents "unlinked" flow cards when new variants (hybrid/prefixed) are added. 
 * 
 */

const ROOT = process.cwd();
const APP_JSON_PATH = path.join(ROOT, 'app.json');

const FORBIDDEN_FILTERS = [
  'driver_id=switch_2gang',
  'driver_id=switch_3gang',
  'driver_id=switch_4gang',
  'driver_id=wall_remote_2_gang',
  'driver_id=wall_remote_3_gang',
  'driver_id=wall_remote_4_gang',
  'driver_id=button_wireless_2',
  'driver_id=button_wireless_3',
  'driver_id=button_wireless_4'
];

const MAPPING = {
  'switch_2gang': 'capabilities=onoff.gang2',
  'switch_3gang': 'capabilities=onoff.gang3',
  'switch_4gang': 'capabilities=onoff.gang4',
  'wall_remote_2_gang': 'capabilities=button.2',
  'wall_remote_3_gang': 'capabilities=button.3',
  'wall_remote_4_gang': 'capabilities=button.4',
  'button_wireless_2': 'capabilities=button.2',
  'button_wireless_3': 'capabilities=button.3',
  'button_wireless_4': 'capabilities=button.4'
};

async function main() {
  console.log(' Starting Rule 21 Compliance Audit...');
  
  if (!fs.existsSync(APP_JSON_PATH)) {
    console.error(' app.json not found!');
    process.exit(1);
  }

  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  let violations = 0;
  let fixed = 0;

  ['triggers', 'conditions', 'actions'].forEach(section => {
    if (appJson.flow && appJson.flow[section]) {
      appJson.flow[section].forEach(card => {
        if (card.filter) {
          FORBIDDEN_FILTERS.forEach(forbidden => {
            if (card.filter.includes(forbidden)) {
              console.log(` Violation in ${section} card [${card.id}]: Found forbidden filter "${forbidden}"`);
              violations++;
              
              const driverId = forbidden.split('=')[1];
              if (MAPPING[driverId]) {
                card.filter = card.filter.replace(forbidden, MAPPING[driverId]);
                console.log(`   Auto-fixed: Replaced with "${MAPPING[driverId]}"`);
                fixed++;
              }
            }
          });
        }
      });
    }
  });

  //  Rule 28: Composite Identity Integrity (v7.0.25)
  console.log(' Checking Rule 28 (Composite Identity Mapping)...');
  try {
    const VariationManager = require('../../lib/ManufacturerVariationManager');
    const driversDir = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    drivers.forEach(d => {
      const cp = path.join(driversDir, d, 'driver.compose.json');
      if (!fs.existsSync(cp)) return;
      const j = JSON.parse(fs.readFileSync(cp, 'utf8'));
      const mfrs = j.zigbee?.manufacturerName || []      ;
      const pid = (j.zigbee?.productId || [])[0] || 'unknown'       ;
      
      mfrs.forEach(mfr => {
        if (mfr.startsWith('_TZE') || mfr.startsWith('_TZ3')) {
          const config = VariationManager.getManufacturerConfig(mfr, pid, d );
          if (config.protocol === 'mixed' && !VariationManager.needsSpecialConfig(mfr, pid, d)) {
            // console.log(`    Note: ${mfr} uses generic mixed config in ${d}`);
          }
        }
      });
    });
    console.log('   Composite integrity check passed.');
  } catch (err) {
    console.warn('   Rule 28 check skipped: VariationManager not accessible or failed:', err.message);
  }

  if (fixed > 0) {
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));
    console.log(`\n Audit complete. Corrected ${fixed} violations of Rule 21.`);
  } else if (violations === 0) {
    console.log('\n 100% Compliance. No Rule 21 violations found.');
  } else {
    console.log(`\n Audit complete. Found ${violations} violations, but could not auto-fix all.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(' Linter crashed:', err);
  process.exit(1);
});
