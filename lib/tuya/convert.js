/**
 * Central conversion helpers for Tuya DPs and Zigbee clusters
 * Pure JS, side-effect free
 */

const clusterNameToId = {
  genBasic: 0x0000,
  genPowerCfg: 0x0001,
  genDeviceTempCfg: 0x0002,
  genIdentify: 0x0003,
  genGroups: 0x0004,
  genScenes: 0x0005,
  genOnOff: 0x0006,
  genLevelCtrl: 0x0008,
  lightingColorCtrl: 0x0300,
};

function toClusterId(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const key = value.trim();
    if (key in clusterNameToId) return clusterNameToId[key];
    const numeric = Number(key);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return value;
}

module.exports = { clusterNameToId, toClusterId };


