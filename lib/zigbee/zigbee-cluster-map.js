'use strict';

/**
 * Maps ZCL cluster names/IDs to internal identifiers
 */
const CLUSTER_MAP = {
  0x0000: 'genBasic',
  0x0003: 'genIdentify',
  0x0004: 'genGroups',
  0x0005: 'genScenes',
  0x0006: 'genOnOff',
  0x0008: 'genLevelCtrl',
  0x000A: 'genTime',
  0x0019: 'genOta',
  0x0101: 'ssIasZone',
  0x0400: 'msIlluminanceMeasurement',
  0x0402: 'msTemperatureMeasurement',
  0x0405: 'msRelativeHumidity',
  0x0406: 'msOccupancySensing',
  0xEF00: 'tuya',
  0xE000: 'zosungIRControl',
  0xE001: 'zosungIRTransmit'
};

function getClusterIdentifier(cluster) {
  if (typeof cluster === 'number') return CLUSTER_MAP[cluster] || `cluster_0x${cluster.toString(16)}`;
  return cluster;
}

module.exports = {
  CLUSTER_MAP,
  getClusterIdentifier
};
