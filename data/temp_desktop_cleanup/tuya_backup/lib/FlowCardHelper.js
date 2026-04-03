'use strict';

/**
 * FlowCardHelper v5.5.533
 *
 * Utility to register flow cards for button drivers.
 * Prevents "flow card not found" errors when using GUI test buttons.
 * 
 * v5.5.533: CRITICAL FIX - Flow card IDs now match driver.flow.compose.json exactly!
 *           Pattern: ${driverId}_button_${buttonCount}gang_button_pressed
 *           NOT:     ${driverId}_button_pressed (was WRONG!)
 * v5.5.332: Added guard to prevent duplicate listener registration warnings
 */

// Track which flow cards have already been registered (global across all drivers)
const _registeredFlowCards = new Set();

/**
 * Register flow cards for a button driver
 * @param {Object} driver - The driver instance (this)
 * @param {string} driverId - Driver ID (e.g., 'button_wireless_1', 'button_wireless_4')
 * @param {number} buttonCount - Number of buttons (1, 2, 3, 4, 6, 8)
 */
function registerButtonFlowCards(driver, driverId, buttonCount = 1) {
  const homey = driver.homey;

  // v5.5.533: FIXED - Main triggers with CORRECT IDs matching driver.flow.compose.json
  // Pattern: ${driverId}_button_${buttonCount}gang_button_pressed
  const mainPressTypes = [
    { suffix: 'pressed', compose: 'button_pressed' },
    { suffix: 'double_press', compose: 'button_double_press' },
    { suffix: 'long_press', compose: 'button_long_press' },
    { suffix: 'multi_press', compose: 'button_multi_press' }
  ];

  for (const pressType of mainPressTypes) {
    // v5.5.533: CORRECT ID format: button_wireless_4_button_4gang_button_pressed
    const mainTriggerId = `${driverId}_button_${buttonCount}gang_${pressType.compose}`;
    if (!_registeredFlowCards.has(mainTriggerId)) {
      try {
        const card = homey.flow.getDeviceTriggerCard(mainTriggerId);
        if (card) {
          // v5.5.627: CRITICAL FIX - Match button arg with state.button from trigger
          card.registerRunListener(async (args, state) => {
            if (!args.device) {
              driver.error(`[FLOW] Device not found for ${mainTriggerId}`);
              return false;
            }
            // Match selected button (args.button) with triggered button (state.button)
            if (args.button && state.button) {
              return String(args.button) === String(state.button);
            }
            return true;
          });
          _registeredFlowCards.add(mainTriggerId);
          driver.log(`[FLOW] ✅ ${mainTriggerId}`);
        }
      } catch (e) {
        // Silent - card may not exist
      }
    }
  }

  // v5.5.533: Per-button triggers (for all button devices including 1-gang)
  // Pattern: ${driverId}_button_${buttonCount}gang_button_${i}_pressed
  const buttonPressTypes = ['pressed', 'double', 'long'];
  
  for (let i = 1; i <= buttonCount; i++) {
    for (const pressType of buttonPressTypes) {
      const buttonTriggerId = `${driverId}_button_${buttonCount}gang_button_${i}_${pressType}`;
      if (!_registeredFlowCards.has(buttonTriggerId)) {
        try {
          const card = homey.flow.getDeviceTriggerCard(buttonTriggerId);
          if (card) {
            card.registerRunListener(async (args, state) => {
              if (!args.device) {
                driver.error(`[FLOW] Device not found for ${buttonTriggerId}`);
                return false;
              }
              return true;
            });
            _registeredFlowCards.add(buttonTriggerId);
            driver.log(`[FLOW] ✅ ${buttonTriggerId}`);
          }
        } catch (e) {
          // Silent
        }
      }
    }
  }

  // v5.5.533: Battery trigger with CORRECT ID
  // Pattern: ${driverId}_button_${buttonCount}gang_measure_battery_changed
  const batteryTriggerId = `${driverId}_button_${buttonCount}gang_measure_battery_changed`;
  if (!_registeredFlowCards.has(batteryTriggerId)) {
    try {
      const card = homey.flow.getDeviceTriggerCard(batteryTriggerId);
      if (card) {
        card.registerRunListener(async (args, state) => {
          if (!args.device) return false;
          return true;
        });
        _registeredFlowCards.add(batteryTriggerId);
        driver.log(`[FLOW] ✅ ${batteryTriggerId}`);
      }
    } catch (e) {
      // Silent
    }
  }

  driver.log(`[FLOW] Flow cards registration complete for ${driverId}`);
}

/**
 * Register flow cards for SOS button driver
 * @param {Object} driver - The driver instance
 */
function registerSOSFlowCards(driver) {
  const homey = driver.homey;

  const triggers = [
    'button_emergency_sos_pressed',
    'button_emergency_sos_measure_battery_changed',
    'sos_button_pressed'  // Generic
  ];

  for (const triggerId of triggers) {
    if (_registeredFlowCards.has(triggerId)) {
      continue;
    }
    try {
      const card = homey.flow.getDeviceTriggerCard(triggerId);
      if (card) {
        card.registerRunListener(async (args, state) => true);
        _registeredFlowCards.add(triggerId);
        driver.log(`[FLOW] ✅ ${triggerId}`);
      }
    } catch (e) {
      // Silent
    }
  }

  driver.log('[FLOW] SOS flow cards registration complete');
}

module.exports = {
  registerButtonFlowCards,
  registerSOSFlowCards
};
