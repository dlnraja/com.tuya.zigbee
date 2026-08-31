'use strict';

/**
 * Homey Device Updates helper (P2357 / P2359)
 *
 * Native Zigbee OTA via Homey ≥13.2 + Mobile ≥9.10.
 * News: https://homey.app/en-fr/news/introducing-device-updates/
 * SDK:  https://apps.developer.homey.app/wireless/zigbee/zigbee-firmware-updates
 *
 * WHY: One SSOT for runtime UX + CI so Maintenance / Flow / gate share the same
 * wording and platform gates. Never point users at external Tuya flash when
 * Homey Device Updates can install app-shipped OEM images.
 */

const fs = require('fs');
const path = require('path');

const SSOT_PATH = path.join(__dirname, '..', '..', 'config', 'architecture', 'homey-device-updates.json');
const BUNDLED_FALLBACK = {
  requirements: { homeyFirmwareMin: '13.2.0', mobileAppMin: '9.10.0' },
  userPaths: {
    settings: 'More (…) → Settings → Device Updates',
    maintenance: 'Device → Maintenance → Check Device Updates',
  },
};

let _ssot;

function loadSsot() {
  if (_ssot) return _ssot;
  try {
    if (fs.existsSync(SSOT_PATH)) {
      // WHY(P2359): Buffer parse — TITAN forbids utf8 string JSON.load of large/config files
      _ssot = JSON.parse(fs.readFileSync(SSOT_PATH));
      return _ssot;
    }
  } catch { /* Homey bundle may omit config/ */ }
  _ssot = BUNDLED_FALLBACK;
  return _ssot;
}

function parseSemver(v) {
  const m = String(v || '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function semverGte(a, b) {
  const A = parseSemver(a);
  const B = parseSemver(b);
  if (!A || !B) return false;
  if (A.major !== B.major) return A.major > B.major;
  if (A.minor !== B.minor) return A.minor > B.minor;
  return A.patch >= B.patch;
}

/**
 * Detect Homey platform firmware version when available.
 * @param {object} homey - Homey API (`this.homey` / `app.homey`)
 */
function getHomeyFirmwareVersion(homey) {
  try {
    const v = homey?.platform?.version
      || homey?.version
      || homey?.settings?.get?.('homeyFirmwareVersion');
    if (v) return String(v);
  } catch { /* ignore */ }
  return null;
}

function isDeviceUpdatesPlatformReady(homey) {
  const ssot = loadSsot();
  const min = ssot.requirements?.homeyFirmwareMin || '13.2.0';
  const cur = getHomeyFirmwareVersion(homey);
  if (!cur) return { ready: null, current: null, min, reason: 'platform_version_unknown' };
  const ready = semverGte(cur, min);
  return {
    ready,
    current: cur,
    min,
    reason: ready ? 'ok' : 'homey_firmware_too_old',
  };
}

function driverHasNativeFirmwareUpdates(driverOrDevice) {
  try {
    const manifest = typeof driverOrDevice?.getDriver === 'function'
      ? driverOrDevice.getDriver()?.manifest
      : driverOrDevice?.manifest;
    const fu = manifest?.firmwareUpdates;
    const updates = fu?.updates || manifest?.updates || [];
    return Array.isArray(updates) && updates.length > 0;
  } catch {
    return false;
  }
}

function userGuidance({ available, newVersion, platform, hasNativeImages } = {}) {
  const ssot = loadSsot();
  const settings = ssot.userPaths?.settings || 'Settings → Device Updates';
  const maintenance = ssot.userPaths?.maintenance || 'device Maintenance';
  const minFw = ssot.requirements?.homeyFirmwareMin || '13.2.0';
  const minApp = ssot.requirements?.mobileAppMin || '9.10.0';

  if (platform && platform.ready === false) {
    return `Homey Device Updates needs Homey ≥${minFw} and Mobile App ≥${minApp} (now ${platform.current || 'unknown'}). Update Homey first, then use ${settings}.`;
  }

  if (available && newVersion != null) {
    return `Firmware v${newVersion} available. Install via Homey → ${settings} (or ${maintenance}). Requires Homey ≥${minFw} + Mobile ≥${minApp}.`;
  }

  if (hasNativeImages) {
    return `No newer OEM image for this couple right now. You can still open Homey → ${settings} to confirm.`;
  }

  return `No app-shipped Zigbee OTA image for this device yet. Check Homey → ${settings} when the manufacturer publishes one.`;
}

function notificationExcerpt(deviceName, { available, newVersion } = {}) {
  const ssot = loadSsot();
  const settings = ssot.userPaths?.settings || 'Settings → Device Updates';
  if (available && newVersion != null) {
    return `[${deviceName}] Firmware v${newVersion} — open Homey → ${settings} (or device Maintenance) to install.`;
  }
  return `${deviceName} is on the latest firmware known to this app. You can also check Homey → ${settings}.`;
}

module.exports = {
  loadSsot,
  parseSemver,
  semverGte,
  getHomeyFirmwareVersion,
  isDeviceUpdatesPlatformReady,
  driverHasNativeFirmwareUpdates,
  userGuidance,
  notificationExcerpt,
};
