'use strict';

/**
 * P3070-energy: energy object for a device just confirmed as mains powered.
 * Some switch/dimmer drivers declare `energy.batteries` in their manifest because they also hold battery
 * variants, so Homey has no "power when on/off" for the mains devices of those drivers. When a device is
 * confirmed as mains (and has no power meter), the default estimate of PowerSourceResolver (couple, then
 * driver rule, then class) is handed to Homey as a native approximation that the user can still change.
 * Same precedence as the manifest defaults: only on/off loads, only constant or linear_dim curves.
 */
const NATIVE_CURVES = new Set(['constant', 'linear_dim']);

function mainsEnergyFor(device) {
  const energy = { batteries: null, mains: true };
  try {
    const has = (c) => Boolean(device.hasCapability?.(c));
    if (!has('onoff') || has('measure_power') || has('meter_power')) {return energy;}
    const R = require('./PowerSourceResolver');
    const s = (k) => device.getSetting?.(k) || '';
    const def = R.defaultFor({
      manufacturerName: s('zb_manufacturer_name') || device.getStoreValue?.('manufacturerName') || '',
      productId: s('zb_product_id') || device.getStoreValue?.('productId') || '',
      driverId: device.driver?.id || '',
      deviceClass: device.getClass?.() || device.driver?.manifest?.class || '',
    });
    if (typeof def.onW === 'number' && def.onW > 0 && NATIVE_CURVES.has(def.curve)) {
      energy.approximation = { usageOn: def.onW, usageOff: typeof def.standbyW === 'number' ? def.standbyW : 0 };
    }
  } catch { /* soft: mains flag only */ }
  return energy;
}

module.exports = { mainsEnergyFor };
