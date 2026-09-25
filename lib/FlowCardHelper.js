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

const {
  shouldRunForDeviceAndButton,
} = require('./flow/FlowCardDeviceResolve');

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
      registerDeviceTrigger(driver, buttonTriggerId, shouldRunForDeviceAndButton);
    }
  }

  // Support both the current manifest IDs and older generated battery trigger IDs.
  const batteryTriggerIds = [
    `${driverId}_battery_low`,
    `${driverId}_battery_changed`,
    `${driverId}_measure_battery_changed`,
    `${driverId}_button_${buttonCount}gang_measure_battery_changed`,
  ];
  for (const batteryTriggerId of batteryTriggerIds) {
    registerDeviceTrigger(driver, batteryTriggerId, shouldRunForDeviceAndButton);
  }

  // WHY(P2449): scene_recall cards were declared on button drivers but never registered
  const sceneRecallIds = [
    `${driverId}_button_${buttonCount}gang_button_scene_recall`,
    `${driverId}_scene_recall`,
  ];
  for (let i = 1; i <= buttonCount; i++) {
    sceneRecallIds.push(`${driverId}_button_${buttonCount}gang_button_${i}_scene_recall`);
    sceneRecallIds.push(`${driverId}_button_${i}_scene_recall`);
  }
  for (const sceneId of sceneRecallIds) {
    registerDeviceTrigger(driver, sceneId, shouldRunForDeviceAndButton);
  }

  // WHY(P2628): short Athom-safe IDs for remote_button_wireless_wall
  if (/remote_button_wireless_wall/i.test(driverId)) {
    for (const id of [
      'remote_button_wireless_wall_btn_pressed',
      'remote_button_wireless_wall_btn_double',
      'remote_button_wireless_wall_btn_long',
      'remote_button_wireless_wall_btn_multi',
      'remote_button_wireless_wall_btn1_pressed',
      'remote_button_wireless_wall_btn1_double',
      'remote_button_wireless_wall_btn1_long',
      'remote_button_wireless_wall_btn1_triple',
      'remote_button_wireless_wall_btn1_release',
      'remote_button_wireless_wall_scene_recall',
      'remote_button_wireless_wall_battery_low',
    ]) {
      registerDeviceTrigger(driver, id, shouldRunForDeviceAndButton);
    }
  }
  // WHY(P2628): scene_switch_N uses *_button_pressed with dropdown (no Ngang in id)
  if (/^scene_switch_/i.test(driverId)) {
    for (const press of ['button_pressed', 'button_double_press', 'button_long_press', 'button_multi_press']) {
      registerDeviceTrigger(driver, `${driverId}_${press}`, shouldRunForDeviceAndButton);
    }
    for (let i = 1; i <= buttonCount; i++) {
      for (const press of ['pressed', 'double', 'long', 'triple', 'release']) {
        registerDeviceTrigger(driver, `${driverId}_button_${i}_${press}`, shouldRunForDeviceAndButton);
      }
    }
  }

  // WHY(P2746): register EVERY declared trigger from driver.flow.compose.json
  // Contre quoi: invent-only lists miss hashed / hybrid IDs → tagged Flows never match.
  try {
    const path = require('path');
    const fs = require('fs');
    const flowPath = path.join(driver.homey?.dir || process.cwd(), 'drivers', driverId, 'driver.flow.compose.json');
    // Homey runtime: driver path via __dirname of driver module is not available here;
    // fall back to cwd/drivers (works on Homey + CI).
    let composeFlow = null;
    const candidates = [
      flowPath,
      path.join(process.cwd(), 'drivers', driverId, 'driver.flow.compose.json'),
    ];
    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        composeFlow = JSON.parse(fs.readFileSync(fp, 'utf8'));
        break;
      }
    }
    // Also try relative to this helper (../../drivers)
    if (!composeFlow) {
      const alt = path.join(__dirname, '..', 'drivers', driverId, 'driver.flow.compose.json');
      if (fs.existsSync(alt)) composeFlow = JSON.parse(fs.readFileSync(alt, 'utf8'));
    }
    for (const t of composeFlow?.triggers || []) {
      if (t?.id) registerDeviceTrigger(driver, t.id, shouldRunForDeviceAndButton);
    }
  } catch (_e) { /* soft — invent list above still covers common IDs */ }

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
  registerSOSFlowCards,
  shouldRunForDeviceAndButton,
};
