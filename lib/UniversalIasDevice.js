'use strict';

/**
 * UniversalIasDevice - Base class for all IAS security devices
 *
 * Supports: HEIMAN, SONOFF, Tuya, Aqara, and other Zigbee 3.0 devices
 *
 * Device Types:
 * - Smoke detectors (IAS Zone Type 0x0028)
 * - CO detectors (IAS Zone Type 0x002B)
 * - Water leak sensors (IAS Zone Type 0x002A)
 * - Motion sensors (IAS Zone Type 0x000D)
 * - Contact sensors (IAS Zone Type 0x0015)
 * - Sirens/Strobes (IAS WD 0x0502)
 *
 * @author Dylan Rajasekaram
 * @version 1.0.0
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  ZigbeeClusterManager,
  CLUSTERS,
  IAS_ZONE_TYPES,
  IAS_ZONE_STATUS,
  IAS_WD_WARNING_MODE,
  IAS_WD_SIREN_LEVEL,
  TUYA_DP_TYPE,
  TUYA_DP
} = require('./ZigbeeClusterManager');

class UniversalIasDevice extends ZigBeeDevice {

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  async onNodeInit({ zclNode }) {
    this.log('UniversalIasDevice initializing...');

    // Store zclNode reference
    this._zclNode = zclNode;

    // Initialize cluster manager
    this.clusterManager = new ZigbeeClusterManager(this);

    // Detect device type and manufacturer
    await this._detectDeviceType();

    // Initialize based on device type
    await this._initializeDevice();

    this.log('UniversalIasDevice initialized:', this._deviceType);
  }

  /**
   * Detect device type from zone type or manufacturer
   */
  async _detectDeviceType() {
    const manufacturerName = this.getSetting('zb_manufacturer_name') || '';
    const modelId = this.getSetting('zb_model_id') || '';

    this._manufacturer = manufacturerName.toUpperCase();
    this._modelId = modelId;
    const mfrLower = (manufacturerName || '').toLowerCase();
    this._isTuya = mfrLower.startsWith('_tz') || mfrLower.startsWith('_ty');
    this._isHeiman = mfrLower.includes('heiman');
    this._isSonoff = mfrLower.includes('sonoff') || mfrLower.includes('ewelink');
    this._isAqara = mfrLower.includes('lumi') || mfrLower.includes('aqara');

    // Try to get IAS Zone type
    try {
      const zoneType = await this.clusterManager.getIasZoneType(1);
      this._zoneType = zoneType;
      this._deviceType = this._mapZoneTypeToDeviceType(zoneType);
    } catch (err) {
      // Fallback: detect from capabilities
      this._deviceType = this._detectFromCapabilities();
    }

    this.log('Device detected:', {
      manufacturer: this._manufacturer,
      modelId: this._modelId,
      zoneType: this._zoneType,
      deviceType: this._deviceType,
      isTuya: this._isTuya
    });
  }

  /**
   * Map IAS Zone type to device type string
   */
  _mapZoneTypeToDeviceType(zoneType) {
    const mapping = {
      [IAS_ZONE_TYPES.FIRE_SENSOR]: 'smoke',
      [IAS_ZONE_TYPES.CO_SENSOR]: 'co',
      [IAS_ZONE_TYPES.WATER_SENSOR]: 'water',
      [IAS_ZONE_TYPES.MOTION_SENSOR]: 'motion',
      [IAS_ZONE_TYPES.CONTACT_SWITCH]: 'contact',
      [IAS_ZONE_TYPES.VIBRATION_SENSOR]: 'vibration',
      [IAS_ZONE_TYPES.PERSONAL_EMERGENCY]: 'sos',
      [IAS_ZONE_TYPES.STANDARD_WARNING]: 'siren',
      [IAS_ZONE_TYPES.GLASS_BREAK]: 'glass',
      [IAS_ZONE_TYPES.REMOTE_CONTROL]: 'remote',
      [IAS_ZONE_TYPES.KEY_FOB]: 'keyfob'
    };
    return mapping[zoneType] || 'unknown';
  }

  /**
   * Detect device type from capabilities
   */
  _detectFromCapabilities() {
    if (this.hasCapability('alarm_smoke')) return 'smoke';
    if (this.hasCapability('alarm_co')) return 'co';
    if (this.hasCapability('alarm_water')) return 'water';
    if (this.hasCapability('alarm_motion')) return 'motion';
    if (this.hasCapability('alarm_contact')) return 'contact';
    if (this.hasCapability('alarm_siren') || this.hasCapability('onoff')) return 'siren';
    if (this.hasCapability('alarm_generic')) return 'generic';
    return 'unknown';
  }

  // ===========================================================================
  // DEVICE INITIALIZATION
  // ===========================================================================

  async _initializeDevice() {
    // Register IAS Zone for sensors
    if (this._deviceType !== 'siren') {
      await this._initializeIasZone();
    }

    // Register IAS WD for sirens
    if (this._deviceType === 'siren') {
      await this._initializeSiren();
    }

    // Register Tuya cluster if needed
    if (this._isTuya) {
      await this._initializeTuya();
    }

    // Register battery
    await this._initializeBattery();

    // Register capability listeners
    await this._registerCapabilityListeners();
  }

  /**
   * Initialize IAS Zone for security sensors
   */
  async _initializeIasZone() {
    const success = await this.clusterManager.registerIasZone({
      endpoint: 1,
      autoEnroll: true,
      onAlarm: (alarm1, alarm2, status) => this._handleAlarm(alarm1, alarm2, status),
      onTamper: (tamper, status) => this._handleTamper(tamper, status),
      onBatteryLow: (low, status) => this._handleBatteryLow(low, status)
    });

    if (!success) {
      this.log('IAS Zone not available, trying alternative methods');
      await this._initializeAlternativeAlarm();
    }
  }

  /**
   * Initialize siren (IAS WD)
   */
  async _initializeSiren() {
    // Try standard IAS WD first
    const success = await this.clusterManager.registerIasWd({ endpoint: 1 });

    if (success) {
      this._sirenMethod = 'iasWd';
      this.log('Siren using IAS WD cluster');
    } else if (this._isTuya) {
      this._sirenMethod = 'tuya';
      this.log('Siren using Tuya DP protocol');
    } else {
      // Try basic on/off cluster
      this._sirenMethod = 'onoff';
      this.log('Siren using OnOff cluster');
    }
  }

  /**
   * Initialize Tuya cluster
   */
  async _initializeTuya() {
    await this.clusterManager.registerTuyaCluster({
      endpoint: 1,
      onDatapoint: (dpId, value, type) => this._handleTuyaDatapoint(dpId, value, type)
    });
  }

  /**
   * Initialize alternative alarm methods (for non-IAS devices)
   */
  async _initializeAlternativeAlarm() {
    // Try occupancy sensing cluster for motion
    if (this._deviceType === 'motion') {
      try {
        const cluster = this._zclNode.endpoints[1].clusters.occupancySensing;
        if (cluster) {
          cluster.on('attr.occupancy', (value) => {
            const occupied = (value & 0x01) === 1;
            this.setCapabilityValue('alarm_motion', occupied).catch(this.error);
            if (occupied) {
              this.driver.triggerFlow('alarm_motion_true', this);
            }
          });
          this.log('Using occupancy sensing cluster');
        }
      } catch (err) {
        this.log('Occupancy sensing not available');
      }
    }

    // Try on/off cluster for contact sensors
    if (this._deviceType === 'contact') {
      try {
        const cluster = this._zclNode.endpoints[1].clusters.onOff;
        if (cluster) {
          cluster.on('attr.onOff', (value) => {
            this.setCapabilityValue('alarm_contact', value).catch(this.error);
          });
          this.log('Using onOff cluster for contact');
        }
      } catch (err) {
        this.log('OnOff cluster not available');
      }
    }
  }

  /**
   * Initialize battery monitoring
   */
  async _initializeBattery() {
    if (!this.hasCapability('measure_battery')) return;

    await this.clusterManager.registerBattery({
      endpoint: 1,
      useTuyaDP: this._isTuya
    });
  }

  // ===========================================================================
  // ALARM HANDLERS
  // ===========================================================================

  /**
   * Handle IAS Zone alarm
   */
  async _handleAlarm(alarm1, alarm2, status) {
    const alarm = alarm1 || alarm2;

    this.log('Alarm triggered:', { alarm1, alarm2, deviceType: this._deviceType });

    // Update appropriate capability based on device type
    switch (this._deviceType) {
    case 'smoke':
      await this.setCapabilityValue('alarm_smoke', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('smoke');
      break;

    case 'co':
      await this.setCapabilityValue('alarm_co', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('co');
      break;

    case 'water':
      await this.setCapabilityValue('alarm_water', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('water');
      break;

    case 'motion':
      await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('motion');
      break;

    case 'contact':
      await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('contact');
      break;

    case 'vibration':
      await this.setCapabilityValue('alarm_vibration', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('vibration');
      break;

    case 'sos':
    case 'generic':
    default:
      await this.setCapabilityValue('alarm_generic', alarm).catch(this.error);
      if (alarm) this._triggerAlarmFlow('generic');
      break;
    }
  }

  /**
   * Handle tamper alert
   */
  async _handleTamper(tamper, status) {
    if (this.hasCapability('alarm_tamper')) {
      await this.setCapabilityValue('alarm_tamper', tamper).catch(this.error);
    }
    this.log('Tamper alert:', tamper);
  }

  /**
   * Handle battery low alert
   */
  async _handleBatteryLow(low, status) {
    if (this.hasCapability('alarm_battery')) {
      await this.setCapabilityValue('alarm_battery', low).catch(this.error);
    }
    this.log('Battery low:', low);
  }

  /**
   * Handle Tuya datapoint
   */
  _handleTuyaDatapoint(dpId, value, type) {
    this.log('Tuya DP:', { dpId, value, type });

    // Handle based on DP ID
    switch (dpId) {
    case TUYA_DP.BATTERY_PERCENT:
      if (this.hasCapability('measure_battery')) {
        this.setCapabilityValue('measure_battery', parseFloat(value)).catch(this.error);
        this.setCapabilityValue('alarm_battery', value < 20).catch(this.error);
      }
      break;

    case TUYA_DP.TEMPERATURE:
      if (this.hasCapability('measure_temperature')) {
        // Tuya temps are often in 0.1°C or 0.01°C
        const temp = value / 10;
        this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(this.error);
      }
      break;

    case TUYA_DP.HUMIDITY:
      if (this.hasCapability('measure_humidity')) {
        this.setCapabilityValue('measure_humidity', parseFloat(value)).catch(this.error);
      }
      break;

    case TUYA_DP.OCCUPANCY:
      if (this.hasCapability('alarm_motion')) {
        this.setCapabilityValue('alarm_motion', !!value).catch(this.error);
      }
      break;

    case TUYA_DP.CONTACT_STATE:
      if (this.hasCapability('alarm_contact')) {
        this.setCapabilityValue('alarm_contact', !!value).catch(this.error);
      }
      break;

    case TUYA_DP.WATER_LEAK:
      if (this.hasCapability('alarm_water')) {
        this.setCapabilityValue('alarm_water', !!value).catch(this.error);
      }
      break;

    case TUYA_DP.SIREN_SWITCH:
      if (this.hasCapability('alarm_siren')) {
        this.setCapabilityValue('alarm_siren', !!value).catch(this.error);
      }
      if (this.hasCapability('onoff')) {
        this.setCapabilityValue('onoff', !!value).catch(this.error);
      }
      break;
    }
  }

  /**
   * Trigger alarm flow
   */
  _triggerAlarmFlow(type) {
    try {
      const flowId = `alarm_${type}_true`;
      if (this.driver && this.driver.triggerFlow) {
        this.driver.triggerFlow(flowId, this);
      }
    } catch (err) {
      this.log('Flow trigger error:', err.message);
    }
  }

  // ===========================================================================
  // CAPABILITY LISTENERS
  // ===========================================================================

  async _registerCapabilityListeners() {
    // Siren control
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._controlSiren(value);
      });
    }

    if (this.hasCapability('alarm_siren')) {
      this.registerCapabilityListener('alarm_siren', async (value) => {
        return this._controlSiren(value);
      });
    }
  }

  /**
   * Control siren on/off
   */
  async _controlSiren(on) {
    this.log('Siren control:', on, 'method:', this._sirenMethod);

    switch (this._sirenMethod) {
    case 'iasWd':
      if (on) {
        return this.clusterManager.startWarning({
          mode: IAS_WD_WARNING_MODE.BURGLAR,
          sirenLevel: IAS_WD_SIREN_LEVEL.HIGH,
          duration: this.getSetting('siren_duration') || 30
        });
      } else {
        return this.clusterManager.stopWarning();
      }

    case 'tuya':
      return this.clusterManager.tuyaSirenControl(on, {
        volume: this.getSetting('siren_volume') || 2,
        duration: this.getSetting('siren_duration') || 30
      });

    case 'onoff':
    default:
      try {
        const cluster = this._zclNode.endpoints[1].clusters.onOff;
        if (on) {
          await cluster.setOn();
        } else {
          await cluster.setOff();
        }
        return true;
      } catch (err) {
        this.error('OnOff control failed:', err);
        return false;
      }
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Trigger siren with options
   */
  async triggerSiren(options = {}) {
    const {
      duration = 30,
      mode = 'burglar',
      volume = 'high'
    } = options;

    const modeMap = {
      'stop': IAS_WD_WARNING_MODE.STOP,
      'burglar': IAS_WD_WARNING_MODE.BURGLAR,
      'fire': IAS_WD_WARNING_MODE.FIRE,
      'emergency': IAS_WD_WARNING_MODE.EMERGENCY
    };

    const volumeMap = {
      'low': IAS_WD_SIREN_LEVEL.LOW,
      'medium': IAS_WD_SIREN_LEVEL.MEDIUM,
      'high': IAS_WD_SIREN_LEVEL.HIGH,
      'very_high': IAS_WD_SIREN_LEVEL.VERY_HIGH
    };

    return this.clusterManager.startWarning({
      mode: modeMap[mode] || IAS_WD_WARNING_MODE.BURGLAR,
      sirenLevel: volumeMap[volume] || IAS_WD_SIREN_LEVEL.HIGH,
      duration
    });
  }

  /**
   * Stop siren
   */
  async stopSiren() {
    return this.clusterManager.stopWarning();
  }

  /**
   * Squawk (short beep)
   */
  async squawk(mode = 'armed') {
    return this.clusterManager.squawk({
      mode: mode === 'disarmed' ? 1 : 0
    });
  }

  /**
   * Test alarm (for detectors)
   */
  async testAlarm() {
    await this._handleAlarm(true, false, 0x0001);
    setTimeout(() => {
      this._handleAlarm(false, false, 0x0000);
    }, 3000);
  }
}

module.exports = UniversalIasDevice;
