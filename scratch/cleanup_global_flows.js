const fs = require('fs');
const path = require('path');

const globalIds = new Set([
  'radio_presence_detected',
  'is_radio_presence_detected',
  'calibrate_virtual_energy',
  'set_sensing_threshold',
  'auto_off_timer_triggered',
  'button_triple_clicked',
  'overload_detected',
  'sub_capability_changed',
  'measure_radio_stability_changed', // Added just in case
  'tuya_dp_received',
  'tuya_dp_send',
  'tuya_dp_equals'
]);

const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());

drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    const composePath = path.join(driverPath, 'driver.compose.json');
    const flowPath = path.join(driverPath, 'driver.flow.compose.json');

    [composePath, flowPath].forEach(filePath => {
        if (fs.existsSync(filePath)) {
            try {
                let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                let changed = false;

                function filterFlows(obj) {
                    if (!obj) return;
                    ['triggers', 'conditions', 'actions'].forEach(section => {
                        if (Array.isArray(obj[section])) {
                            const originalCount = obj[section].length;
                            obj[section] = obj[section].filter(card => {
                                // Remove if it's a global ID OR a prefixed version of a global ID (from my previous mistake)
                                const isGlobal = globalIds.has(card.id) || 
                                               (card.id.startsWith(driver + '_') && globalIds.has(card.id.substring(driver.length + 1)));
                                
                                if (isGlobal) {
                                    console.log(`[CLEANUP] Removing global/duplicate ID ${card.id} from ${filePath}`);
                                    return false;
                                }
                                return true;
                            });
                            if (obj[section].length !== originalCount) changed = true;
                        }
                    });
                }

                if (filePath.endsWith('driver.flow.compose.json')) {
                    filterFlows(content);
                } else if (content.flow) {
                    filterFlows(content.flow);
                }

                if (changed) {
                    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
                }
            } catch (e) {
                console.error(`Error processing ${filePath}: ${e.message}`);
            }
        }
    });
});
