'use strict';

/**
 * #105 follow-up: drivers that only gain `meter_power.exported` at runtime (power clamps, metering plugs
 * that report produced energy) cannot declare it in driver.compose.json `energy`, because Homey requires
 * the capability in the manifest list. Once the capability exists on a device we tell Homey Energy
 * which capability is exported, through Device.setEnergy().
 *
 * Kept narrow on purpose: setEnergy() is a one-way override per device (later compose changes no
 * longer apply), so it only runs when neither the manifest nor an earlier override declares an export
 * capability, and only once per device instance.
 * Source: Athom Apps SDK, "Energy" (meterPowerImportedCapability / meterPowerExportedCapability).
 */
async function ensureExportEnergy(device) {
  if (!device || device._exportEnergyChecked) { return false; }
  if (typeof device.setEnergy !== 'function' || typeof device.hasCapability !== 'function') { return false; }
  if (!device.hasCapability('meter_power.exported') || !device.hasCapability('meter_power')) { return false; }
  device._exportEnergyChecked = true;
  const manifest = (device.driver && device.driver.manifest && device.driver.manifest.energy) || {};
  let override = {};
  try { override = (typeof device.getEnergy === 'function' && device.getEnergy()) || {}; } catch (_) { override = {}; }
  const declared = (e) => Boolean(e && (e.meterPowerExportedCapability || e.cumulativeExportedCapability));
  if (declared(manifest) || declared(override)) { return false; }
  if (override.cumulative || manifest.cumulative) { return false; } // main-meter config is the user's call
  try {
    await device.setEnergy({
      ...manifest,
      ...override,
      meterPowerImportedCapability: 'meter_power',
      meterPowerExportedCapability: 'meter_power.exported',
    });
    if (typeof device.log === 'function') { device.log('[ENERGY] exported kWh declared to Homey Energy (meter_power.exported)'); }
    return true;
  } catch (e) {
    if (typeof device.log === 'function') { device.log('[ENERGY] setEnergy failed:', e && e.message); }
    return false;
  }
}

module.exports = { ensureExportEnergy };
