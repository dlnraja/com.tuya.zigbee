'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

class motion_sensor_2 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    if (this.isFirstInit()){
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.IAS_ZONE,
          attributeName: 'zoneStatus',
          minInterval: 5, // Minimum interval between reports (seconds)
          maxInterval: 3600, // Maximum interval (1 hour)
          minChange: 0, // Report any change
        },{
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
        },{
          endpointId: 1,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 3600, // Maximum interval (1 hour)
          minChange: 10, // Report changes above 10 lux
        }
      ]).catch(this.error;
    }

    // alarm_motion handler
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = payload => {
		  this.onZoneStatusChangeNotification(payload);
      };
  
    // measure_battery and alarm_battery handler
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
		
    // measure_illuminance handler
    zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

    // Tuya specific cluster handler
    zclNode.endpoints[1].clusters.tuya.on('reporting', value => this.processResponse(value));

  }

  // Handle motion status alarms
  onZoneStatusChangeNotification({ zoneStatus }) {
    this.log('Motion status: ', zoneStatus.alarm1);
    this.setCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
  }

  // Handle battery status attribute reports
  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    const batteryLevel = batteryPercentageRemaining * 2; // Convert to percentage
    this.log('measure_battery | Battery level (%):', batteryLevel);
    this.setCapabilityValue('measure_battery', batteryLevel).catch(this.error);
    this.setCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this.error);
  }
	
  // Handle illuminance attribute reports
  onIlluminanceMeasuredAttributeReport(measuredValue) {
    const luxValue = Math.round(Math.pow(10, (measuredValue - 1) / 10000)); // Convert measured value to lux
    this.log('measure_luminance | Illuminance (lux):', luxValue);
    this.setCapabilityValue('measure_luminance', luxValue).catch(this.error);
  }

  // Process Tuya-specific data
  processResponse(data) {
    this.log('Tuya-specific cluster data:', data);
  }
  		
  // Handle device removal
  onDeleted() {
    this.log('Motion Sensor removed');
  }

}

module.exports = motion_sensor_2;
