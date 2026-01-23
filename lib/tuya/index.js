'use strict';

module.exports = {
  TuyaEF00Manager: require('./TuyaEF00Manager'),
  TuyaSyncManager: require('./TuyaSyncManager'),
  TuyaMultiGangManager: require('./TuyaMultiGangManager'),
  TuyaDataPointsComplete: require('./TuyaDataPointsComplete'),
  TuyaDPMapperComplete: require('./TuyaDPMapperComplete'),
  TuyaManufacturerCluster: require('./TuyaManufacturerCluster'),
  TuyaAdapter: require('./TuyaAdapter'),
  LocalTuyaInspired: require('./LocalTuyaInspired'),
  LocalTuyaEntityHandler: require('./LocalTuyaEntityHandler'),
  LocalTuyaDPDatabase: require('./LocalTuyaDPDatabase'),
  // v5.5.760: Johan Bendz enrichment
  TuyaDataPointsJohan: require('./TuyaDataPointsJohan'),
  TuyaHelpersJohan: require('./TuyaHelpersJohan'),
  // v5.5.761: Z2M enrichment
  TuyaDataPointsZ2M: require('./TuyaDataPointsZ2M'),
};
