'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class Ts1001DeviceStandardDefaultDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.log('Device initialized:', this.getData().id);
    
    // Enregistrement des capabilities selon la catégorie
    if (category === 'light') {
      await this.registerLightCapabilities();
    } else if (category === 'switch' || category === 'plug') {
      await this.registerSwitchCapabilities();
    } else if (category.startsWith('sensor-')) {
      await this.registerSensorCapabilities(category);
    } else if (category === 'cover') {
      await this.registerCoverCapabilities();
    } else if (category === 'lock') {
      await this.registerLockCapabilities();
    }
  }
  
  async registerLightCapabilities() {
    try {
      // Capability onoff
      await this.registerCapability('onoff', 'genOnOff', {
        get: 'onOff',
        set: 'toggle',
        setParser: () => ({}),
        report: 'onOff',
        reportParser: (value) => value === 1,
      });
      
      // Capability dim
      await this.registerCapability('dim', 'genLevelCtrl', {
        get: 'currentLevel',
        set: 'moveToLevel',
        setParser: (value) => ({ level: Math.round(value * 255) }),
        report: 'currentLevel',
        reportParser: (value) => value / 255,
      });
      
      this.log('Capabilities lumière enregistrées');
    } catch (error) {
      this.error('Erreur enregistrement capabilities lumière:', error);
    }
  }
  
  async registerSwitchCapabilities() {
    try {
      await this.registerCapability('onoff', 'genOnOff', {
        get: 'onOff',
        set: 'toggle',
        setParser: () => ({}),
        report: 'onOff',
        reportParser: (value) => value === 1,
      });
      
      this.log('Capabilities switch enregistrées');
    } catch (error) {
      this.error('Erreur enregistrement capabilities switch:', error);
    }
  }
  
  async registerSensorCapabilities(sensorType) {
    try {
      if (sensorType.includes('temp')) {
        await this.registerCapability('measure_temperature', 'genBasic', {
          get: 'currentTemperature',
          report: 'currentTemperature',
          reportParser: (value) => value / 100,
        });
      }
      
      if (sensorType.includes('humidity')) {
        await this.registerCapability('measure_humidity', 'genBasic', {
          get: 'currentHumidity',
          report: 'currentHumidity',
          reportParser: (value) => value / 100,
        });
      }
      
      if (sensorType.includes('motion')) {
        await this.registerCapability('alarm_motion', 'genBasic', {
          get: 'motionDetected',
          report: 'motionDetected',
          reportParser: (value) => value === 1,
        });
      }
      
      this.log('Capabilities capteur enregistrées');
    } catch (error) {
      this.error('Erreur enregistrement capabilities capteur:', error);
    }
  }
  
  async registerCoverCapabilities() {
    try {
      await this.registerCapability('windowcoverings_state', 'genWindowCovering', {
        get: 'currentPositionLiftPercentage',
        set: 'goToLiftPercentage',
        setParser: (value) => ({ percentageLift: Math.round(value * 100) }),
        report: 'currentPositionLiftPercentage',
        reportParser: (value) => value / 100,
      });
      
      this.log('Capabilities cover enregistrées');
    } catch (error) {
      this.error('Erreur enregistrement capabilities cover:', error);
    }
  }
  
  async registerLockCapabilities() {
    try {
      await this.registerCapability('lock_state', 'genDoorLock', {
        get: 'lockState',
        set: 'setDoorLockState',
        setParser: (value) => ({ doorLockState: value === 'locked' ? 1 : 2 }),
        report: 'lockState',
        reportParser: (value) => value === 1 ? 'locked' : 'unlocked',
      });
      
      this.log('Capabilities lock enregistrées');
    } catch (error) {
      this.error('Erreur enregistrement capabilities lock:', error);
    }
  }
  
  async onDeleted() {
    this.log('Device deleted:', this.getData().id);
  }
}

module.exports = Ts1001DeviceStandardDefaultDevice;
