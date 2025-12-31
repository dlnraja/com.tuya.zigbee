'use strict';

/**
 * FlowCardHelper v5.5.332
 *
 * Utility to register flow cards for button drivers.
 * Prevents "flow card not found" errors when using GUI test buttons.
 * v5.5.332: Added guard to prevent duplicate listener registration warnings
 */

// Track which flow cards have already been registered (global across all drivers)
const _registeredFlowCards = new Set();

/**
 * Register flow cards for a button driver
 * @param {Object} driver - The driver instance (this)
 * @param {string} driverId - Driver ID (e.g., 'button_wireless', 'button_wireless_4')
 * @param {number} buttonCount - Number of buttons (1, 2, 3, 4, 6, 8)
 */
function registerButtonFlowCards(driver, driverId, buttonCount = 1) {
  const homey = driver.homey;

  // Generic triggers (from .homeycompose/flow/triggers/)
  // These are shared across all button drivers - only register once
  const genericTriggers = [
    'button_pressed',
    'button_double_press',
    'button_long_press'
  ];

  for (const triggerId of genericTriggers) {
    // Skip if already registered by another driver
    if (_registeredFlowCards.has(triggerId)) {
      continue;
    }
    try {
      const card = homey.flow.getDeviceTriggerCard(triggerId);
      if (card) {
        card.registerRunListener(async (args, state) => true);
        _registeredFlowCards.add(triggerId);
        driver.log(`[FLOW] ✅ Generic: ${triggerId}`);
      }
    } catch (e) {
      // Silent - card may not exist
    }
  }

  // Driver-specific triggers
  const pressTypes = ['pressed', 'double_pressed', 'long_pressed', 'released'];

  for (const pressType of pressTypes) {
    // Main trigger with button token
    const mainTriggerId = `${driverId}_button_${pressType}`;
    if (!_registeredFlowCards.has(mainTriggerId)) {
      try {
        const card = homey.flow.getDeviceTriggerCard(mainTriggerId);
        if (card) {
          card.registerRunListener(async (args, state) => true);
          _registeredFlowCards.add(mainTriggerId);
          driver.log(`[FLOW] ✅ ${mainTriggerId}`);
        }
      } catch (e) {
        // Silent
      }
    }

    // Per-button triggers (for multi-button devices)
    if (buttonCount > 1) {
      for (let i = 1; i <= buttonCount; i++) {
        const buttonTriggerId = `${driverId}_button_${buttonCount}gang_button_${i}_${pressType}`;
        if (!_registeredFlowCards.has(buttonTriggerId)) {
          try {
            const card = homey.flow.getDeviceTriggerCard(buttonTriggerId);
            if (card) {
              card.registerRunListener(async (args, state) => true);
              _registeredFlowCards.add(buttonTriggerId);
              driver.log(`[FLOW] ✅ ${buttonTriggerId}`);
            }
          } catch (e) {
            // Silent
          }
        }
      }
    }
  }

  // Battery low trigger
  const batteryTriggerId = `${driverId}_battery_low`;
  if (!_registeredFlowCards.has(batteryTriggerId)) {
    try {
      const card = homey.flow.getDeviceTriggerCard(batteryTriggerId);
      if (card) {
        card.registerRunListener(async (args, state) => true);
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
