'use strict';

/**
 * CONVERTERS INDEX
 * 
 * Export tous les converters disponibles
 */

module.exports = {
  battery: require('./battery'),
  illuminance: require('./illuminance'),
  temperature: require('./temperature'),
  humidity: require('./humidity'),
  onoff: require('./onoff'),
  dim: require('./dim'),
  cover: require('./cover'),
  thermostat: require('./thermostat')
};
