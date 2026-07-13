'use strict';

/**
 * TuyaModernExtend - v9.0.0
 * Reusable "Traits" for Tuya devices, inspired by Z2M Modern Extend.
 * Allows drivers to be defined by composition rather than inheritance alone.
 */
class TuyaModernExtend {
  /**
   * Add basic On/Off functionality
   */
  static async tuyaOnOff(device, options = {}) {
    const { dp = 1, capability = 'onoff' } = options;
    
    await device.safeAddCapability(capability);
    
    // Register command listener
    device.registerCapabilityListener(capability, async (value) => {
      device.log(`[EXTEND] Setting ${capability} to ${value}`);
      return await device.writeTuyaDP(dp, value);
    });
  }

  /**
   * Add Multi-Gang On/Off
   * @param {number|Object[]} gangs - Number of gangs or array of {dp, capability}
   */
  static async tuyaMultiGang(device, gangs = 1) {
    let gangList = [];
    
    if (Array.isArray(gangs)) {
      gangList = gangs;
    } else if (typeof gangs === 'number') {
      for (let i = 1; i <= gangs; i++) {
        gangList.push({
          dp: i === 1 ? 1 : i === 2 ? 2 : i === 3 ? 3 : 7,
          capability: i === 1 ? 'onoff' : `onoff.gang${i}`
        });
      }
    }

    for (const gang of gangList) {
      const { dp, capability } = gang;
      await device.safeAddCapability(capability);
      
      device.registerCapabilityListener(capability, async (value) => {
        device.log(`[EXTEND] Setting Multi-Gang ${capability} to ${value}`);
        return await device.writeTuyaDP(dp, value);
      });
    }
    
    device.log(`[EXTEND] Multi-Gang OnOff (${gangList.length}) initialized`);
  }

  /**
   * Add Battery monitoring
   */
  static async tuyaBattery(device, options = {}) {
    const { dp = 4 } = options;
    await device.safeAddCapability('measure_battery');
    await device.safeAddCapability('alarm_battery');
  }

  /**
   * Add Cover/Curtain functionality
   */
  static async tuyaCover(device, options = {}) {
    const { dp = 1, dp_pos = 2 } = options;
    await device.safeAddCapability('windowcoverings_state');
    await device.safeAddCapability('windowcoverings_set');

    device.registerCapabilityListener('windowcoverings_state', async (value) => {
      // 0 = open, 1 = stop, 2 = close
      const valMap = { open: 0, stop: 1, close: 2 };
      const dpValue = valMap[value];
      return await device.writeTuyaDP(dp, dpValue);
    });

    device.registerCapabilityListener('windowcoverings_set', async (value) => {
      // value is 0.0 to 1.0, Tuya expects 0-100
      const dpValue = Math.round(value * 100);
      return await device.writeTuyaDP(dp_pos, dpValue);
    });
  }

  /**
   * Add Climate/Thermostat functionality
   */
  static async tuyaClimate(device, options = {}) {
    const { dp_temp = 1, dp_target = 2, dp_mode = 4 } = options;
    await device.safeAddCapability('measure_temperature');
    await device.safeAddCapability('target_temperature');
    await device.safeAddCapability('thermostat_mode');

    device.registerCapabilityListener('target_temperature', async (value) => {
       // Typically ×10
       return await device.writeTuyaDP(dp_target, Math.round(value * 10));
    });
  }

  /**
   * Add Time Sync functionality (for LCD devices)
   */
  static async tuyaTimeSync(device, options = {}) {
    const { interval = 3600 } = options;
    
    const sync = async () => {
      device.log('[EXTEND] Syncing time...');
      if (device.tuyaEF00Manager) {
        await device.tuyaEF00Manager._sendMagicPacket(); 
      }
      try {
        const { syncDeviceTimeTuya } = require('./TuyaTimeSync');
        await syncDeviceTimeTuya(device, { useTuyaEpoch: true });
      } catch (e) {
        device.error('[EXTEND] Time sync failed:', e.message);
      }
    };

    await sync();
    device._tuyaTimeSyncInterval = device.homey.setInterval(sync, interval * 1000);
  }

  /**
   * Add Sonoff Calibration (for SNZB-02D etc)
   */
  static async tuyaSonoff(device, options = {}) {
    const { setupSonoffSensor } = require('../mixins/SonoffSensorMixin');
    await setupSonoffSensor(device, device.zclNode);
  }

  /**
   * Add Radar/Presence functionality
   */
  static async tuyaRadar(device, options = {}) {
    const IntelligentPresenceInference = require('../sensors/IntelligentPresenceInference');
    device.presenceInference = new IntelligentPresenceInference(device);
    
    await device.safeAddCapability('alarm_motion');
    
    // Initialize inference with firmware version if available
    const appVersion = device.getStoreValue('appVersion');
    if (appVersion) {
      device.presenceInference.setFirmwareInfo(appVersion);
    }

    device.log('[EXTEND] Radar Presence Trait initialized');
  }

  /**
   * Add Air Quality functionality
   */
  static async tuyaAirQuality(device, options = {}) {
    const { 
      dp_co2 = 2, 
      dp_temp = 18, 
      dp_hum = 19, 
      dp_voc = 21, 
      dp_pm25 = 20, 
      dp_hcho = 22 
    } = options;

    const capabilities = [
      'measure_co2', 'measure_temperature', 'measure_humidity', 
      'measure_voc', 'measure_pm25', 'measure_formaldehyde'
    ];

    for (const cap of capabilities) {
      await device.safeAddCapability(cap);
    }

    device.log('[EXTEND] Air Quality Trait initialized');
  }

  /**
   * Add Relay functionality (for Radar with switch)
   */
  static async tuyaRelay(device, options = {}) {
    const { dp = 108, capability = 'onoff' } = options;
    
    await device.safeAddCapability(capability);
    
    device.registerCapabilityListener(capability, async (value) => {
      device.log(`[EXTEND] Relay Switch ${capability} -> ${value}`);
      return await device.writeTuyaDP(dp, value);
    });
    
    device.log(`[EXTEND] Relay Trait initialized on DP${dp}`);
  }
}

module.exports = TuyaModernExtend;
