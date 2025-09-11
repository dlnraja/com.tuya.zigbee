const StandardTuyaDriver = require('../../_template/standard_driver');
const { Cluster, CLUSTER } = require("zigbee-clusters");

class WaterLeakDriver extends StandardTuyaDriver {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Water leak specific initialization
    this.registerCapability('alarm_water', 'ssIasZone', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        },
    });
    
    this.log('Water leak sensor initialized');
  }

module.exports = WaterLeakDriver;
