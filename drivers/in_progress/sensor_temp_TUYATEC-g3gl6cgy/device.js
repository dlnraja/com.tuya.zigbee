try {
const { ZigbeeDevice } = require('homey-meshdriver');

class SensorTemp_TUYATEC_g3gl6cgy extends ZigbeeDevice {
  async 
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    this.log('Sensor Temp TUYATEC-g3gl6cgy initialized');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('alarm_battery', 'genPowerCfg');
    // Ajoutez ici d'autres capacitÃ©s si besoin
  }
}

module.exports = SensorTemp_TUYATEC_g3gl6cgy;



} catch(e) { this.error('Driver error', e); }


