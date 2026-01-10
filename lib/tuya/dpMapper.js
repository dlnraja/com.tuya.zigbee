'use strict';

/**
 * dpMapper.js - v5.3.17
 *
 * Universal Tuya DP to Homey Capability mapper
 *
 * Usage:
 *   const mapTuyaDPToCapabilities = require('./dpMapper');
 *   mapTuyaDPToCapabilities(device, dp, value);
 */

/**
 * Map a Tuya DP value to device capabilities
 *
 * @param {Object} device - Homey device instance
 * @param {number} dp - DataPoint ID
 * @param {any} value - Parsed value from device
 */
function mapTuyaDPToCapabilities(device, dp, value) {
  if (!device) return;

  device.log(`[DP-MAPPER] Processing DP${dp} = ${JSON.stringify(value)}`);

  switch (dp) {
  // ══════════════════════════════════════════════════════════════════════════
  // DP 1: OnOff / Alarm (most devices)
  // ══════════════════════════════════════════════════════════════════════════
  case 1:
    if (device.hasCapability('onoff')) {
      device.setCapabilityValue('onoff', !!value).catch(e => device.error('[DP-MAPPER] onoff:', e.message));
    }
    if (device.hasCapability('alarm_water')) {
      device.setCapabilityValue('alarm_water', !!value).catch(e => device.error('[DP-MAPPER] alarm_water:', e.message));
    }
    if (device.hasCapability('alarm_contact')) {
      device.setCapabilityValue('alarm_contact', !!value).catch(e => device.error('[DP-MAPPER] alarm_contact:', e.message));
    }
    if (device.hasCapability('alarm_motion')) {
      device.setCapabilityValue('alarm_motion', !!value).catch(e => device.error('[DP-MAPPER] alarm_motion:', e.message));
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 2: Position / Dim
    // ══════════════════════════════════════════════════════════════════════════
  case 2:
    if (device.hasCapability('windowcoverings_set')) {
      const pos = Math.max(0, Math.min(1, value / 100));
      device.setCapabilityValue('windowcoverings_set', pos).catch(e => device.error('[DP-MAPPER] windowcoverings_set:', e.message));
    }
    if (device.hasCapability('dim')) {
      const dim = Math.max(0, Math.min(1, value / 1000));
      device.setCapabilityValue('dim', parseFloat(dim)).catch(e => device.error('[DP-MAPPER] dim:', e.message));
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 3: Position inverted (some curtains)
    // ══════════════════════════════════════════════════════════════════════════
  case 3:
    if (device.hasCapability('windowcoverings_set')) {
      const pos = Math.max(0, Math.min(1, (100 - value) / 100));
      device.setCapabilityValue('windowcoverings_set', pos).catch(e => device.error('[DP-MAPPER] windowcoverings_set:', e.message));
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 4, 10, 14, 15: Battery percentage
    // ══════════════════════════════════════════════════════════════════════════
  case 4:
  case 10:
  case 15:
    if (device.hasCapability('measure_battery')) {
      const battery = Math.max(0, Math.min(100, value));
      device.setCapabilityValue('measure_battery', parseFloat(battery)).catch(e => device.error('[DP-MAPPER] measure_battery:', e.message));
      device.emit('tuya_dp_battery', battery);
      device.log(`[DP-MAPPER] ✅ Battery: ${battery}%`);
    }
    break;

  case 14:
    if (device.hasCapability('measure_battery')) {
      // DP 14 sometimes uses 0-200 scale
      const battery = Math.max(0, Math.min(100, value > 100 ? Math.round(value / 2) : value));
      device.setCapabilityValue('measure_battery', parseFloat(battery)).catch(e => device.error('[DP-MAPPER] measure_battery:', e.message));
      device.emit('tuya_dp_battery', battery);
      device.log(`[DP-MAPPER] ✅ Battery: ${battery}%`);
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 5: Curtain motor alarm - uses unique capability name
    // ══════════════════════════════════════════════════════════════════════════
  case 5:
    if (device.hasCapability('alarm_curtain_motor')) {
      device.setCapabilityValue('alarm_curtain_motor', !!value).catch(e => device.error('[DP-MAPPER] alarm_curtain_motor:', e.message));
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 7, 8, 9: Multi-gang switch (gang 2, 3, 4)
    // ══════════════════════════════════════════════════════════════════════════
  case 7:
    if (device.hasCapability('onoff.2')) {
      device.setCapabilityValue('onoff.2', !!value).catch(e => device.error('[DP-MAPPER] onoff.2:', e.message));
    }
    break;
  case 8:
    if (device.hasCapability('onoff.3')) {
      device.setCapabilityValue('onoff.3', !!value).catch(e => device.error('[DP-MAPPER] onoff.3:', e.message));
    }
    break;
  case 9:
    if (device.hasCapability('onoff.4')) {
      device.setCapabilityValue('onoff.4', !!value).catch(e => device.error('[DP-MAPPER] onoff.4:', e.message));
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 18: Temperature (some devices) - scale /10
    // ══════════════════════════════════════════════════════════════════════════
  case 18:
    if (device.hasCapability('measure_temperature')) {
      const temp = value / 10;
      if (temp >= -40 && temp <= 80) {
        device.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(e => device.error('[DP-MAPPER] measure_temperature:', e.message));
        device.log(`[DP-MAPPER] ✅ Temperature: ${temp}°C`);
      }
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 19: Humidity (some devices) - scale /10 or direct
    // ══════════════════════════════════════════════════════════════════════════
  case 19:
    if (device.hasCapability('measure_humidity')) {
      const humidity = value > 100 ? value / 10 : value;
      if (humidity >= 0 && humidity <= 100) {
        device.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(e => device.error('[DP-MAPPER] measure_humidity:', e.message));
        device.log(`[DP-MAPPER] ✅ Humidity: ${humidity}%`);
      }
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 101: Temperature OR Battery (device-dependent)
    // ══════════════════════════════════════════════════════════════════════════
  case 101:
    // First try temperature (most common for DP 101)
    if (device.hasCapability('measure_temperature')) {
      const temp = value / 10;
      if (temp >= -40 && temp <= 80) {
        device.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(e => device.error('[DP-MAPPER] measure_temperature:', e.message));
        device.log(`[DP-MAPPER] ✅ Temperature: ${temp}°C`);
      }
    }
    // Fallback to battery if no temperature capability
    else if (device.hasCapability('measure_battery')) {
      const battery = Math.max(0, Math.min(100, value));
      device.setCapabilityValue('measure_battery', parseFloat(battery)).catch(e => device.error('[DP-MAPPER] measure_battery:', e.message));
      device.emit('tuya_dp_battery', battery);
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 102: Humidity - scale /10 or direct
    // ══════════════════════════════════════════════════════════════════════════
  case 102:
    if (device.hasCapability('measure_humidity')) {
      const humidity = value > 100 ? value / 10 : value;
      if (humidity >= 0 && humidity <= 100) {
        device.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(e => device.error('[DP-MAPPER] measure_humidity:', e.message));
        device.log(`[DP-MAPPER] ✅ Humidity: ${humidity}%`);
      }
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 103: Soil moisture (same as humidity)
    // ══════════════════════════════════════════════════════════════════════════
  case 103:
    if (device.hasCapability('measure_humidity')) {
      const moisture = value > 100 ? value / 10 : value;
      if (moisture >= 0 && moisture <= 100) {
        device.setCapabilityValue('measure_humidity', parseFloat(moisture)).catch(e => device.error('[DP-MAPPER] measure_humidity:', e.message));
        device.log(`[DP-MAPPER] ✅ Soil moisture: ${moisture}%`);
      }
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 104: Illuminance
    // ══════════════════════════════════════════════════════════════════════════
  case 104:
    if (device.hasCapability('measure_luminance')) {
      device.setCapabilityValue('measure_luminance', parseFloat(value)).catch(e => device.error('[DP-MAPPER] measure_luminance:', e.message));
      device.log(`[DP-MAPPER] ✅ Illuminance: ${value} lux`);
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 33, 35: Voltage (mV or cV)
    // ══════════════════════════════════════════════════════════════════════════
  case 33:
  case 35:
    if (device.hasCapability('measure_voltage')) {
      const voltage = value > 100 ? value / 100 : value / 10;
      if (voltage > 0 && voltage < 50) {
        device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(e => device.error('[DP-MAPPER] measure_voltage:', e.message));
        device.log(`[DP-MAPPER] ✅ Voltage: ${voltage}V`);
      }
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // DP 247: Voltage (mV) - USB/mains devices
    // ══════════════════════════════════════════════════════════════════════════
  case 247:
    if (device.hasCapability('measure_voltage')) {
      const voltage = value / 1000;
      if (voltage > 0 && voltage < 300) {
        device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(e => device.error('[DP-MAPPER] measure_voltage:', e.message));
        device.log(`[DP-MAPPER] ✅ Voltage: ${voltage}V`);
      }
    }
    break;

    // ══════════════════════════════════════════════════════════════════════════
    // Default: Log unhandled DP
    // ══════════════════════════════════════════════════════════════════════════
  default:
    device.log(`[DP-MAPPER] ⚠️ Unhandled DP${dp} = ${JSON.stringify(value)}`);
    // Store for debugging
    device.setStoreValue(`unknown_dp_${dp}`, { value, timestamp: Date.now() }).catch(() => { });
    break;
  }

  // Emit generic event for custom handling
  device.emit('tuya_dp', { dp, value });
}

module.exports = mapTuyaDPToCapabilities;
