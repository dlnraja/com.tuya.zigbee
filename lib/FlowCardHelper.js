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

function shouldRunForDeviceAndButton(args = {}, state = {}) {
  if (!args.device) {
    return false;
  }
  if (args.button !== undefined && state.button !== undefined) {
    return String(args.button) === String(state.button);
  }
  return true;
}

function registerDeviceTrigger(driver, triggerId, listener = shouldRunForDeviceAndButton) {
  const homey = driver.homey;
  if (_registeredFlowCards.has(triggerId)) {
    return false;
  }
  try {
    const card = homey.flow.getDeviceTriggerCard(triggerId);
    if (!card) {
      return false;
    }
    if (typeof card.registerRunListener === 'function') {
      card.registerRunListener(async (args = {}, state = {}) => listener(args, state));
    }
    _registeredFlowCards.add(triggerId);
    driver.log(`[FLOW] registered ${triggerId}`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Register flow cards for a button driver
 * @param {Object} driver - The driver instance (this)
 * @param {string} driverId - Driver ID (e.g., 'button_wireless_1', 'button_wireless_4')
 * @param {number} buttonCount - Number of buttons (1, 2, 3, 4, 6, 8)
 */
function registerButtonFlowCards(driver, driverId, buttonCount = 1) {
  // v5.5.533: FIXED - Main triggers with CORRECT IDs matching driver.flow.compose.json
  // Pattern: ${driverId}_button_${buttonCount}gang_button_pressed
  const mainPressTypes = [
    'button_pressed',
    'button_double_press',
    'button_long_press',
    'button_multi_press',
  ];

  for (const pressType of mainPressTypes) {
    // v5.5.533: CORRECT ID format: button_wireless_4_button_4gang_button_pressed
    const mainTriggerId = `${driverId}_button_${buttonCount}gang_${pressType}`;
    registerDeviceTrigger(driver, mainTriggerId);
  }

  // v5.5.533: Per-button triggers (for all button devices including 1-gang)
  // Pattern: ${driverId}_button_${buttonCount}gang_button_${i}_pressed
  const buttonPressTypes = ['pressed', 'double', 'long', 'triple', 'release'];
  
  for (let i = 1; i <= buttonCount; i++) {
    for (const pressType of buttonPressTypes) {
      const buttonTriggerId = `${driverId}_button_${buttonCount}gang_button_${i}_${pressType}`;
      registerDeviceTrigger(driver, buttonTriggerId, async (args = {}) => !!args.device);
    }
  }

  // Support both the current manifest IDs and older generated battery trigger IDs.
  const batteryTriggerIds = [
    `${driverId}_battery_low`,
    `${driverId}_measure_battery_changed`,
    `${driverId}_button_${buttonCount}gang_measure_battery_changed`,
  ];
  for (const batteryTriggerId of batteryTriggerIds) {
    registerDeviceTrigger(driver, batteryTriggerId, async (args = {}) => !!args.device);
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
