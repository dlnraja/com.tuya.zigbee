const { ZigbeeDevice } = require('homey-meshdriver');

class SensorsTS0601water extends ZigbeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des capabilities de base
    this.registerCapability('onoff', 'genOnOff');
    
    // Configuration des capabilities spécifiques selon la configuration
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'genElectricalMeasurement');
    }
    
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl');
    }
    
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'genTemperatureMeasurement');
    }
    
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'genHumidityMeasurement');
    }
    
    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', 'genPowerCfg');
    }
    
    if (this.hasCapability('lock')) {
      this.registerCapability('lock', 'genDoorLock');
    }
    
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', 'genWindowCovering');
    }
    
    if (this.hasCapability('target_temperature')) {
      this.registerCapability('target_temperature', 'genThermostat');
    }
    
    console.log('sensors-TS0601_water initialized successfully');
  }
}

module.exports = SensorsTS0601water;