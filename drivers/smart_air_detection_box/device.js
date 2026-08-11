"use strict";

const { Cluster } = require("zigbee-clusters");
const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

let smartParse = null;
try {
  ({ smartParse } = require("../../lib/managers/SmartDivisorManager"));
} catch (_e) {
  smartParse = null;
}

// Data Points for TS0601 (_TZE200_yvx5lh6k)
const dataPoints = {
  tsCO2: 2,
  tsTemperature: 18,
  tsHumidity: 19,
  tsFormaldehyde: 21,
  tsVOC: 22,
};

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
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
    case dataTypes.string: {
      let dataString = "";
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    }
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    default:
      return null;
  }
};

class SmartAirDetectionBox extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();

    if (typeof this._ensureTuyaIo === "function") {
      await this._ensureTuyaIo().catch(() => {});
    }

    const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya && typeof tuya.on === "function") {
      // P112: listen reporting + response (Yannick #2029 mute after update)
      tuya.on("response", (value) => this.handleDataPoint(value));
      tuya.on("reporting", (value) => this.handleDataPoint(value));
      if (typeof tuya.on === "function" && tuya.listenerCount) {
        /* already attached */
      }
    }
  }

  _scaleSensor(dpId, raw, capability, fallbackDivisor) {
    if (smartParse) {
      try {
        const parsed = smartParse(raw, dpId, {
          capability,
          manufacturerName:
            this.getSetting?.("zb_manufacturer_name") ||
            this.getData?.()?.manufacturerName,
          productId:
            this.getSetting?.("zb_model_id") ||
            this.getData?.()?.modelId,
          defaultDivisor: fallbackDivisor,
        });
        if (parsed != null && Number.isFinite(Number(parsed))) {
          return Number(parsed);
        }
      } catch (_e) { /* fall through */ }
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n / fallbackDivisor;
  }

  async handleDataPoint(data) {
    if (this._destroyed) return;
    const dp = data.dp;
    const value = getDataValue(data);

    switch (dp) {
      case dataPoints.tsFormaldehyde: {
        const v = this._scaleSensor(dp, value, "measure_formaldehyde", 100);
        this.log("Formaldehyde: ", v);
        if (v != null) await this.safeSetCapabilityValue("measure_formaldehyde", v).catch(() => {});
        break;
      }
      case dataPoints.tsVOC: {
        const v = this._scaleSensor(dp, value, "measure_voc", 10);
        this.log("VOC: ", v);
        if (v != null) await this.safeSetCapabilityValue("measure_voc", v).catch(() => {});
        break;
      }
      case dataPoints.tsCO2: {
        const v = this._scaleSensor(dp, value, "measure_co2", 1);
        this.log("CO2: ", v);
        if (v != null) await this.safeSetCapabilityValue("measure_co2", v).catch(() => {});
        break;
      }
      case dataPoints.tsTemperature: {
        const temperatureValue = this._scaleSensor(dp, value, "measure_temperature", 10);
        this.log("Temperature: ", temperatureValue);
        if (temperatureValue != null) {
          await this.safeSetCapabilityValue("measure_temperature", temperatureValue).catch(() => {});
        }
        break;
      }
      case dataPoints.tsHumidity: {
        const humidityValue = this._scaleSensor(dp, value, "measure_humidity", 10);
        this.log("Humidity: ", humidityValue);
        if (humidityValue != null) {
          await this.safeSetCapabilityValue("measure_humidity", humidityValue).catch(() => {});
        }
        break;
      }
      default:
        this.log("Unhandled Data Point (dp, value):", dp, value);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log("Smart Air Detection Box removed");
  }
}

module.exports = SmartAirDetectionBox;
