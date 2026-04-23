const { safeDivide } = require('../utils/tuyaUtils.js');

/**
 * Intelligent Power Source Detection (v6.0)
 * Replaces hardcoded mainsPowered arrays with dynamic detection
 */

const MfrHelper = require('./ManufacturerNameHelper');
const { getModelId, getManufacturer } = require('./DeviceDataHelper');

class PowerSourceIntelligence {
  /**
   * Determine power source dynamically from multiple factors
   */
  static async detectPowerSource(device, zclNode) {
    let powerSource = 'unknown';
    let confidence = 0;
    const reasons = [];

    // 1. ZCL Basic Cluster attribute (0x0007 - powerSource)
    try {
      if (zclNode && zclNode.endpoints) {
        for (const epId of Object.keys(zclNode.endpoints)) {
          const ep = zclNode.endpoints[epId];
          if (ep.clusters && ep.clusters.basic) {
            const powerSourceAttr = ep.clusters.basic.attributes && ep.clusters.basic.attributes.powerSource;
            if (powerSourceAttr !== undefined) {
              if (powerSourceAttr === 3) {
                powerSource = 'battery';
                confidence += 50;
                reasons.push('ZCL Basic Cluster (0x0007) reported Battery (3)');
              } else if (powerSourceAttr === 1 || powerSourceAttr === 2 || powerSourceAttr === 4) {
                powerSource = 'mains';
                confidence += 50;
                reasons.push('ZCL Basic Cluster (0x0007) reported Mains/DC (' + powerSourceAttr + ')');
              }
            } else {
              try {
                const result = await ep.clusters.basic.readAttributes(['powerSource']).catch(() => null);
                if (result && result.powerSource !== undefined) {
                  if (result.powerSource === 3) {
                    powerSource = 'battery';
                    confidence += 80;
                    reasons.push('ZCL Basic Cluster read returned Battery (3)');
                  } else if (result.powerSource === 1 || result.powerSource === 2 || result.powerSource === 4) {
                    powerSource = 'mains';
                    confidence += 80;
                    reasons.push('ZCL Basic Cluster read returned Mains/DC (' + result.powerSource + ')');
                  }
                }
              } catch (e) {
                // Ignore read errors
              }
            }
          }
        }
      }
    } catch (e) {
      if (device.log) device.log('[POWER-INTEL] Error reading ZCL powerSource:', e.message);
    }

    // 2. Tuya DP Mapping Analysis
    if (device.dpMappings) {
      const dpValues = Object.values(device.dpMappings);
      const hasBatteryDP = dpValues.some(mapping => 
        (mapping && mapping.capability === 'measure_battery') || 
        (mapping && mapping.capability === 'alarm_battery')
      );
      
      if (hasBatteryDP) {
        if (powerSource === 'mains') {
          reasons.push('CONFLICT: Has battery DP but ZCL says mains. Trusting ZCL.');
          confidence -= 20;
        } else {
          powerSource = 'battery';
          confidence += 40;
          reasons.push('DP Mapping contains measure_battery/alarm_battery');
        }
      }
    }

    // 3. Driver Type Inference
    const driverId = (device.driver && device.driver.id) ? device.driver.id : '';
    const strongMainsDrivers = [
      'switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang',
      'dimmer_wall_1gang', 'dimmer_wall_2gang', 'dimmer_wall_3gang',
      'socket', 'socket_power', 'plug_energy_monitor', 'plug_smart',
      'light_rgb', 'light_rgbw', 'bulb_rgb', 'bulb_dimmable',
      'curtain_motor', 'curtain_motor_tilt', 'garage_door_opener'
    ];
    const mixedDrivers = [
      'presence_sensor_radar', 'air_quality_co2', 'air_quality_comprehensive',
      'weather_station_outdoor', 'siren', 'water_valve_smart', 'valve_irrigation',
      'thermostat_tuya_dp', 'smart_lcd_thermostat', 'hvac_controller'
    ];
    const strongBatteryDrivers = [
      'contact_sensor', 'motion_sensor', 'temperature_humidity_sensor',
      'water_leak_sensor', 'smoke_detector', 'gas_detector', 'co_sensor',
      'soil_sensor', 'vibration_sensor', 'button_wireless', 'button_emergency_sos',
      'lock_smart', 'fingerprint_lock', 'radiator_valve'
    ];

    if (strongMainsDrivers.some(d => driverId.includes(d) || d.includes(driverId))) {
      if (powerSource === 'battery') {
        reasons.push('CONFLICT: Driver is strongly mains but earlier checks said battery. Reviewing...');
        confidence -= 30;
      } else {
        powerSource = 'mains';
        confidence += 60;
        reasons.push('Driver type is strictly mains-powered');
      }
    } else if (strongBatteryDrivers.some(d => driverId.includes(d) || d.includes(driverId))) {
      if (powerSource === 'unknown') {
        powerSource = 'battery';
        confidence += 50;
        reasons.push('Driver type is typically battery-powered');
      }
    } else if (mixedDrivers.some(d => driverId.includes(d) || d.includes(driverId))) {
      reasons.push('Driver is known to have mixed power sources (USB or Battery variants exist)');
    }

    // 4. Model ID known exceptions
    const modelId = getModelId(device);
    const knownUsbSensors = [
      '_TZE200_8ygsuhe1', // Smart Airbox
      '_TZE200_yvx5lh6k', // CO2 Sensor
      '_TZE204_sxm7l9xa', // Presence Sensor (mmWave)
      '_TZE204_qasjif9e', // Presence Sensor (mmWave)
      '_TZE200_sh189ga4', // Presence Sensor (mmWave)
      '_TZE200_hbmoozks', // Presence Sensor (mmWave)
      '_TZE204_jog6u9su', // Presence Sensor (mmWave)
      '_TZE200_ikvncluo', // CO2/Air Quality
    ];
    
    if (MfrHelper.includesCI(knownUsbSensors, modelId) || 
        MfrHelper.includesCI(knownUsbSensors, getManufacturer(device)) ||
        MfrHelper.containsCI(getManufacturer(device), 'VISION')) {
      powerSource = 'mains';
      confidence += 90;
      reasons.push('Model/Manufacturer explicitly known as USB/Mains powered (VISION/TS0601 exception)');
    }

    const isMains = powerSource === 'mains' && confidence >= 40;
    
    if (device.log) {
      device.log('[POWER-INTEL]  Detected Power Source: ' + (isMains ? 'MAINS/USB' : 'BATTERY') + ' (Confidence: ' + confidence + '%)');
      reasons.forEach(r => device.log('[POWER-INTEL]  ' + r));
    }

    return { isMains, powerSource, confidence, reasons };
  }

  /**
   * Process capability management based on intelligence
   */
  static async applyCapabilities(device, zclNode) {
    const intel = await this.detectPowerSource(device, zclNode);
    
    // Override the mainsPowered flag for the device
    device._mainsPowered = intel.isMains;

    if (intel.isMains) {
      if (device.hasCapability('measure_battery')) {
        if (device.log) device.log('[POWER-INTEL]  Device is mains/USB powered - removing measure_battery capability');
        try {
          await device.removeCapability('measure_battery');
          if (device.log) device.log('[POWER-INTEL]  Successfully removed measure_battery');
        } catch (e) {
          if (device.log) device.log('[POWER-INTEL]  Failed to remove measure_battery:', e.message);
        }
      }
      
      if (device.hasCapability('alarm_battery')) {
        try {
          await device.removeCapability('alarm_battery');
          if (device.log) device.log('[POWER-INTEL]  Successfully removed alarm_battery');
        } catch (e) {}
      }
    } else {
      // It's battery powered. Add measure_battery if we are confident and driver supports it
      const driverId = (device.driver && device.driver.id) ? device.driver.id : '';
      const driverManifest = (device.driver && device.driver.manifest) ? device.driver.manifest : null;
      
      if (intel.confidence >= 50 && driverManifest && driverManifest.capabilities && driverManifest.capabilities.includes('measure_battery')) {
        if (!device.hasCapability('measure_battery')) {
          if (device.log) device.log('[POWER-INTEL]  Device is battery powered - adding missing measure_battery capability');
          try {
            await device.addCapability('measure_battery');
            if (device.log) device.log('[POWER-INTEL]  Successfully added measure_battery');
          } catch (e) {
            if (device.log) device.log('[POWER-INTEL]  Failed to add measure_battery:', e.message);
          }
        }
      }
    }
    
    return intel;
  }
}

module.exports = PowerSourceIntelligence;



