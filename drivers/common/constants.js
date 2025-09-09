'use strict';

const TUYA_MANUFACTURER_NAME_PREFIX = '_TZ';

const CLUSTERS = {
  BASIC: 'genBasic',
  POWER_CONFIGURATION: 'genPowerCfg',
  ON_OFF: 'genOnOff',
  LEVEL_CONTROL: 'genLevelCtrl',
  COLOR_CONTROL: 'lightingColorCtrl',
  TEMPERATURE_MEASUREMENT: 'msTemperatureMeasurement',
  RELATIVE_HUMIDITY_MEASUREMENT: 'msRelativeHumidity',
  PRESSURE_MEASUREMENT: 'msPressureMeasurement',
  ILLUMINANCE_MEASUREMENT: 'msIlluminanceMeasurement',
  IAS_ZONE: 'ssIasZone',
  ELECTRICAL_MEASUREMENT: 'haElectricalMeasurement',
  METERING: 'seMetering',
  TUYA_MANUFACTURER_CLUSTER: 'manuSpecificTuya',
};

const ATTRIBUTES = {
  batteryPercentageRemaining: 'batteryPercentageRemaining',
  measuredValue: 'measuredValue',
  onOff: 'onOff',
};

const POLLING_INTERVALS_MS = {
  BATTERY: 6 * 60 * 60 * 1000, // 6 hours
};

module.exports = {
  TUYA_MANUFACTURER_NAME_PREFIX,
  CLUSTERS,
  ATTRIBUTES,
  POLLING_INTERVALS_MS,
};
