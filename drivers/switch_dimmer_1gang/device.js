'use strict';

const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const {Cluster, debug} = require('zigbee-clusters');

const dataPoints = {
  state: 1,          // Boolean - on/off state
  brightness: 2,     // Value - brightness level (10-1000)
  minBrightness: 3,  // Value - minimum brightness
  countdown: 9,      // Value - countdown timer
  powerOnBehavior: 14, // Enum - power on behavior
  lightType: 16,     // Enum - light type (led/incandescent/halogen)
};

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

class SwitchDimmer1gang extends TuyaSpecificClusterDevice {

  async onNodeInit({zclNode}) {
    this.printNode();

    // Register capability listeners
    this.registerCapability('onoff', Cluster.CLUSTER.TUYA_SPECIFIC, {
      get: 'dataReport',
      getOpts: {
        getOnStart: true,
      },
      report: 'dataReport',
      reportParser(value) {
        const dp = this.getSingleDatapoint(value, dataPoints.state);
        if (dp) {
          this.log('onoff reportParser:', dp.data);
          return dp.data[0] === 1;
        }
        return null;
      },
      set: async value => {
        this.log('onoff set:', value);
        return this.writeBool(dataPoints.state, value);
      },
    });

    this.registerCapability('dim', Cluster.CLUSTER.TUYA_SPECIFIC, {
      get: 'dataReport',
      getOpts: {
        getOnStart: true,
      },
      report: 'dataReport',
      reportParser(value) {
        const dp = this.getSingleDatapoint(value, dataPoints.brightness);
        if (dp) {
          const brightness = this.readUInt32BE(dp.data);
          this.log('dim reportParser - raw value:', brightness);
          // Tuya brightness is typically 10-1000, convert to 0-1
          const dimValue = Math.max(0, Math.min(1, (brightness - 10) / 990));
          this.log('dim reportParser - converted:', dimValue);
          return dimValue;
        }
        return null;
      },
      set: async value => {
        this.log('dim set:', value);
        // Convert 0-1 to 10-1000
        const brightness = Math.round(10 + (value * 990));
        this.log('dim set - converted to:', brightness);
        return this.writeData32(dataPoints.brightness, brightness);
      },
    });

    // Register additional datapoint handlers for settings if needed
    this.registerDatapointCapability({
      dp: dataPoints.minBrightness,
      name: 'min_brightness',
      type: dataTypes.value,
    });

    this.registerDatapointCapability({
      dp: dataPoints.powerOnBehavior,
      name: 'power_on_behavior',
      type: dataTypes.enum,
    });

    this.registerDatapointCapability({
      dp: dataPoints.lightType,
      name: 'light_type',
      type: dataTypes.enum,
    });
  }

  /**
   * Helper method to get a single datapoint from the report
   */
  getSingleDatapoint(value, dpId) {
    if (!value || !value.dp) return null;
    return value.dp.find(dp => dp.dp === dpId);
  }

  /**
   * Read UInt32 Big Endian from buffer
   */
  readUInt32BE(buffer) {
    if (buffer.length < 4) return 0;
    return buffer.readUInt32BE(0);
  }

  /**
   * Write boolean datapoint
   */
  async writeBool(dp, value) {
    return this.zclNode.endpoints[this.getClusterEndpoint(Cluster.CLUSTER.TUYA_SPECIFIC)]
      .clusters.tuya
      .writeData({
        status: 0,
        transid: this.getRandomInt(0, 255),
        dp,
        datatype: dataTypes.bool,
        length_hi: 0,
        length_lo: 1,
        data: [value ? 1 : 0],
      }, {waitForResponse: false});
  }

  /**
   * Write 32-bit value datapoint
   */
  async writeData32(dp, value) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value, 0);
    
    return this.zclNode.endpoints[this.getClusterEndpoint(Cluster.CLUSTER.TUYA_SPECIFIC)]
      .clusters.tuya
      .writeData({
        status: 0,
        transid: this.getRandomInt(0, 255),
        dp,
        datatype: dataTypes.value,
        length_hi: 0,
        length_lo: 4,
        data: [...data],
      }, {waitForResponse: false});
  }

  /**
   * Generate random transaction ID
   */
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Helper for debugging - prints node information
   */
  printNode() {
    this.log('========================');
    this.log('Node:', this.getName());
    this.log('Battery:', this.hasCapability('measure_battery'));
    this.log('Endpoints:', this.zclNode.endpoints);
    this.log('Manufacturer:', this.getStoreValue('manufacturerName'));
    this.log('Model:', this.getStoreValue('modelId'));
    this.log('========================');
  }

}

module.exports = SwitchDimmer1gang;
