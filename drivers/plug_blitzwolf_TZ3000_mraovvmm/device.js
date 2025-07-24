const { ZigbeeDevice } = require('homey-zigbeedriver');

class PlugBlitzwolf_TZ3000_mraovvmm extends ZigbeeDevice {
  async onInit() {
    this.log('Plug Blitzwolf TZ3000_mraovvmm initialized');
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_power', 'seMetering');
    this.registerCapability('meter_power', 'seMetering');
    this.registerCapability('measure_current', 'haElectricalMeasurement');
    this.registerCapability('measure_voltage', 'haElectricalMeasurement');
    this.registerCapability('measure_battery', 'genPowerCfg');
    this.registerCapability('alarm_battery', 'genPowerCfg');
    // Ajoutez ici d'autres capacités si besoin
  }
}

module.exports = PlugBlitzwolf_TZ3000_mraovvmm;


