'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const TuyaUnifiedDevice = require('../../lib/devices/TuyaUnifiedDevice');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');
const { getAppVersionPrefixed } = require('../../lib/utils/AppVersion');
const { SoilMoistureInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * 
 *             SOIL SENSOR - v5.5.317 INTELLIGENT INFERENCE                    
 * 
 *    v5.5.317: INTELLIGENT INFERENCE ENGINE                                   
 *   - Validates moisture readings with temperature correlation                 
 *   - Predicts watering needs based on moisture trends                         
 *   - Smooths erratic sensor readings                                          
 *                                                                               
 *   KNOWN MODELS:                                                               
 *   - TS0601 / _TZE284_oitavov2 : QT-07S Soil moisture sensor                   
 *   - TS0601 / _TZE284_aao3yzhs : Soil sensor variant                           
 *   - TS0601 / _TZE284_hdml1aav : Flower Care Fertilizer sensor (EC)          
 *                                                                               
 *   DP MAPPINGS:                                                 
 *   - DP3: soil_moisture %                                                      
 *   - DP4: fertilizer_ec                                        
 *   - DP5: temperature / 10                                                      
 *   - DP14: battery_state enum (0=low, 1=med, 2=high)                           
 *   - DP15: battery_percent %                                                   
 *   - DP101: ambient_humidity %                                          
 *   - DP102: illuminance lux                                                   
 *   - DP106: fertilizer_ec (advanced variants)                                  
 *   - DP112: soil_fertility_ec (TZE284 specific)                                
 */
class SoilSensorDevice extends TuyaUnifiedDevice {

  /** Battery powered */
  get mainsPowered() { return false; }

  get forceActiveTuyaMode() { return true; }

  get hybridModeEnabled() { return true; }

  /** Capabilities for soil sensors */
  get sensorCapabilities() {
    return [
      'measure_humidity.soil', 
      'measure_temperature', 
      'measure_humidity', 
      'measure_luminance', 
      'measure_battery', 
      'alarm_battery',
      'alarm_water', 
      'measure_ec'
    ];
  }

  /**
   * v5.5.47: Battery configuration 
   */
  get batteryConfig() {
    return {
      chemistry: BatteryCalculator.CHEMISTRY.CR2032,
      algorithm: BatteryCalculator.ALGORITHM.DIRECT,  // DP15 = direct %
      dpId: 15,           // DP15 = battery percentage
      dpIdState: 14,      // DP14 = battery_state enum (0=low, 1=med, 2=high)
      voltageMin: 2.0,
      voltageMax: 3.0,
    };
  }

  /**
   * DP mappings for Soil Sensors
   */
  get dpMappings() {
    return {
      3: { capability: 'measure_humidity.soil', divisor: 1 },
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          const num = v * 1;
          if (num === null) return null;
          // Handle various Tuya temperature formats (x10, x100, or raw)
          if (Math.abs(num) > 1000) return num * 100;
          if (Math.abs(num) > 100) return num * 10;
          return num; 
        }
      },
      109: { capability: 'measure_humidity', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      14: { 
        capability: 'measure_battery', 
        transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v) 
      },
      102: { capability: 'measure_luminance', divisor: 1 },
      103: { capability, setting: 'report_interval', min: 30, max: 1200 },
      104: { capability, setting: 'soil_calibration', min: -30, max: 30 },
      107: { capability, setting: 'temperature_calibration', min: -20, max: 20 },
      110: { capability, setting: 'soil_warning', min: 0, max: 100 },
      111: { 
        capability: 'measure_humidity.soil', 
        divisor: 1,
        transform: (v) => {
          const mfr = this.getSetting?.('zb_manufacturer_name') || '';if (mfr.includes('npj9bug3')) return v;
          return v === 1; // Fallback to alarm_water
        }
      },
      112: { capability: 'measure_ec', divisor: 1 }, // Soil Conductivity -> EC
      113: { capability, setting: 'soil_fertility_calibration', min: -1000, max: 1000 },
      114: { capability, setting: 'soil_fertility_warning_setting', min: 0, max: 5000 },
      1: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'measure_ec', divisor: 1 },
      101: { capability: 'measure_humidity', divisor: 1 },
      105: { capability: 'measure_humidity.soil', divisor: 1, transform: (v) => v > 100 ? v * 10 : v },
      106: { capability: 'measure_ec', divisor: 1 },
    };
  }

  async onNodeInit({ zclNode }) {
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.log('[SOIL] Base init error:', err.message);
    }

    this.log(`[SOIL] Soil Sensor ${getAppVersionPrefixed()} Stabilized`);

    this._soilInference = new SoilMoistureInference(this, {
      maxMoistureJump: 25,
      dryThreshold: 20,
      wetThreshold: 80
    });
    
    this._initFlowTriggers();

    this._previousMoisture = null;
    this._previousTemperature = null;
    this._previousBattery = null;
  }

  _updateWaterAlarm() {
    const moisture = this.getCapabilityValue('measure_humidity.soil');
    const threshold = this.getSetting('soil_warning_threshold') || 30;
    if (moisture !== null && this.hasCapability('alarm_water')) {
      const alarm = moisture < threshold;
      this.setCapabilityValue('alarm_water', alarm).catch(() => { });
    }
  }

  _handleDP(dpId, value) {
    const dp = Number(dpId);
    let parsedValue = value;
    
    if (Buffer.isBuffer(value)) {
      if (value.length === 4) parsedValue = value.readInt32BE(0);
      else if (value.length === 2) parsedValue = value.readInt16BE(0);
      else if (value.length === 1) parsedValue = value.readUInt8(0);
    }

    // Conductivity / EC
    if (dp === 112 || dp === 4 || dp === 106) {
      this.log(`[SOIL] EC/Conductivity DP${dp} = ${parsedValue}`);
      this.setCapabilityValue('measure_ec', parseFloat(parsedValue)).catch(() => { });
      return;
    }

    if (dp === 3 || dp === 109 || dp === 105) {
      this.log(`[SOIL] Moisture DP${dp} = ${parsedValue}%`);
      let moisture = parsedValue;
      if (dp === 105 && moisture > 100) moisture = moisture * 10;
      
      const targetCap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';
      this.setCapabilityValue(targetCap, parseFloat(moisture)).catch(() => { });
      this._updateWaterAlarm();
      this._triggerMoistureFlows(moisture);
      return;
    }

    if (dp === 5 || dp === 1) {
      let temp = parsedValue;
      if (dp === 1) temp = temp * 10;
      else {
        if (Math.abs(temp) > 1000) temp = temp * 100;
        else if (Math.abs(temp) > 100) temp = temp * 10;
      }
      this.log(`[SOIL] Temp DP${dp} = ${temp}Â°C`);
      this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
      this._triggerTemperatureFlows(temp);
      return;
    }

    super._handleDP(dpId, value);
  }

  _initFlowTriggers() {
    this._flowTriggerMoistureChanged = this._getFlowCardSafe('soil_sensor_moisture_changed');
    this._flowTriggerSoilDry = this._getFlowCardSafe('soil_sensor_soil_dry');
    this._flowTriggerSoilWet = this._getFlowCardSafe('soil_sensor_soil_wet');
  }

  _getFlowCardSafe(id) {
    try { return this._getFlowCard(id); } catch(e) { return null; }
  }

  _triggerMoistureFlows(moisture) {
    if (this._flowTriggerMoistureChanged) {
      this._flowTriggerMoistureChanged.trigger(this, { moisture }).catch(this.error);
    }
    if (this._previousMoisture !== null) {
      if (moisture < 30 && this._previousMoisture >= 30 && this._flowTriggerSoilDry) {
        this._flowTriggerSoilDry.trigger(this, {}).catch(this.error);
      }
      if (moisture > 70 && this._previousMoisture <= 70 && this._flowTriggerSoilWet) {
        this._flowTriggerSoilWet.trigger(this, {}).catch(this.error);
      }
    }
    this._previousMoisture = moisture;
  }

  _triggerTemperatureFlows(temperature) {
    this._previousTemperature = temperature;
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself');
    await this.requestAllDPs().catch(() => {});
  }
}

module.exports = SoilSensorDevice;

