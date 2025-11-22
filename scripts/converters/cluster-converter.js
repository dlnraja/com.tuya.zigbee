/**
 * Cluster Converter - ZHA/Zigbee2MQTT → Homey SDK3
 */
const CLUSTER_MAP = {
  'genBasic': 0, 'basic': 0,
  'genIdentify': 3, 'identify': 3,
  'genGroups': 4, 'groups': 4,
  'genScenes': 5, 'scenes': 5,
  'genOnOff': 6, 'onOff': 6,
  'genLevelCtrl': 8, 'levelControl': 8,
  'genPowerCfg': 1, 'powerConfiguration': 1,
  'msTemperatureMeasurement': 1026, 'temperatureMeasurement': 1026,
  'msRelativeHumidity': 1029, 'relativeHumidity': 1029,
  'msIlluminanceMeasurement': 1024, 'illuminanceMeasurement': 1024,
  'ssIasZone': 1280, 'iasZone': 1280,
  'manuSpecificTuya': 61184,
  'haElectricalMeasurement': 2820,
  'seMetering': 1794,
};

function convertCluster(name) {
  return CLUSTER_MAP[name] || parseInt(name) || 0;
}

module.exports = { CLUSTER_MAP, convertCluster };
