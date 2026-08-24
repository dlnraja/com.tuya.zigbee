'use strict';

/**
 * Shared scene-remote / button-actuator classification (P2235/P2237).
 * WHY: one mfr can map to many devices — actuators (plug USB remotes) must keep onoff TX;
 * sleepy remotes must not get phantom onoff or bind storms.
 */

const SCENE_REMOTE_DRIVER_RE = /^(button_wireless(_\d+)?|scene_switch|smart_remote|remote_button|wall_remote|handheld_remote|smart_knob|button_emergency)/;
const SLEEPY_REMOTE_DRIVER_RE = /button_wireless|scene_switch|smart_remote|remote_button|handheld_remote|smart_knob|button_emergency_sos/;
const ACTUATOR_DRIVER_RE = /button_wireless_(plug|switch|usb|valve|fingerbot)|remote_button_wireless_(usb|plug)/;

function driverIdFrom(deviceOrDriver) {
  if (!deviceOrDriver) return '';
  if (typeof deviceOrDriver === 'string') return deviceOrDriver;
  return String(
    deviceOrDriver.driver?.id
    || deviceOrDriver.driver?.manifest?.id
    || deviceOrDriver.id
    || deviceOrDriver.manifest?.id
    || '',
  );
}

function isButtonActuatorDriverId(driverId) {
  return ACTUATOR_DRIVER_RE.test(String(driverId || ''));
}

function isSceneRemoteDriverId(driverId) {
  return SCENE_REMOTE_DRIVER_RE.test(String(driverId || ''));
}

function isSceneRemoteDevice(device) {
  const driverId = driverIdFrom(device);
  if (isButtonActuatorDriverId(driverId)) return false;
  return (
    device?._forcedDeviceType === 'BUTTON'
    || device?.driver?.manifest?.class === 'button'
    || isSceneRemoteDriverId(driverId)
  );
}

function isSleepyRemoteDevice(device) {
  const driverId = driverIdFrom(device);
  if (isButtonActuatorDriverId(driverId)) return false;
  return (
    SLEEPY_REMOTE_DRIVER_RE.test(driverId)
    || device?.driver?.manifest?.class === 'button'
    || device?._forcedDeviceType === 'BUTTON'
  );
}

module.exports = {
  SCENE_REMOTE_DRIVER_RE,
  SLEEPY_REMOTE_DRIVER_RE,
  ACTUATOR_DRIVER_RE,
  driverIdFrom,
  isButtonActuatorDriverId,
  isSceneRemoteDriverId,
  isSceneRemoteDevice,
  isSleepyRemoteDevice,
};
