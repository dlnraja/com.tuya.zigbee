'use strict';

const {Cluster} = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  tshpsPresenceState: 1,
  tshpscSensitivity: 2,
  tshpsMinimumRange: 3,
  tshpsMaximumRange: 4,
  tshpsTargetDistance: 9,
  tshpsDetectionDelay: 101,
  tshpsFadingTime: 102,
  tshpsIlluminanceLux: 104,
}

const dataTypes = {
  raw: 0, // [ bytes ]
  bool: 1, // [0/1]
  value: 2, // [ 4 byte value ]
  string: 3, // [ N byte string ]
  enum: 4, // [ 0-255 ]
  bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
}

class Tuya24GRadarSensor extends TuyaSpecificClusterDevice {
  async onNodeInit({zclNode}) {
    this.log('Tuya 24G Radar Sensor initialized');
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.updatePosition(value));
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);
    const distanceUpdateInterval = this.getSetting('distance_update_interval') ?? 10;

    switch (dp) {
      case dataPoints.tshpsPresenceState:
        this.log("24G Radar - presence state: " + value);
        this.setCapabilityValue('alarm_motion', Boolean(value));
        break;
      case dataPoints.tshpscSensitivity:
        this.log("24G Radar - sensitivity state: " + value);
        break;
      case dataPoints.tshpsIlluminanceLux:
        this.log("24G Radar - lux value: " + value);
        this.onIlluminanceMeasuredAttributeReport(value);
        break;
      case dataPoints.tshpsTargetDistance:
        if (new Date().getSeconds() % distanceUpdateInterval === 0) {
          this.setCapabilityValue('target_distance', value/100);
        }
        break;
      default:
        this.log('24G Radar - dp value', dp, value);
    }
  }

  onDeleted() {
    this.log("Tuya 24G Radar Sensor removed");
  }

  async onSettings({newSettings, changedKeys}) {
    if (changedKeys.includes('radar_sensitivity')) {
      this.writeData32(dataPoints.tshpscSensitivity, newSettings['radar_sensitivity']);
    }

    if (changedKeys.includes('minimum_range')) {
      this.writeData32(dataPoints.tshpsMinimumRange, newSettings['minimum_range']*100);
    }

    if (changedKeys.includes('maximum_range')) {
      this.writeData32(dataPoints.tshpsMaximumRange, newSettings['maximum_range']*100);
    }

    if (changedKeys.includes('detection_delay')) {
      this.writeData32(dataPoints.tshpsDetectionDelay, newSettings['detection_delay']);
    }

    if (changedKeys.includes('fading_time')) {
      this.writeData32(dataPoints.tshpsFadingTime, newSettings['fading_time']);
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    this.log('24G Radar - measure_luminance | Luminance - measuredValue (lux):', measuredValue);
    this.setCapabilityValue('measure_luminance', measuredValue);
  }

  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('24G Radar - IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_motion', zoneStatus.alarm1);
  }
}

module.exports = Tuya24GRadarSensor;
