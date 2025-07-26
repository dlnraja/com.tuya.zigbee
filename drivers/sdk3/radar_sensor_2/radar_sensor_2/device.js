const { Device } = require('homey');
'use strict'; const { debug, Cluster } = require('zigbee-clusters'); const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster'); const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice"); const { getDataValue } = require('../../lib/TuyaHelpers'); const { V2_RADAR_SENSOR_DATA_POINTS } = require('../../lib/TuyaDataPoints'); Cluster.addCluster(TuyaSpecificCluster); class radarSensor2 extends TuyaSpecificClusterDevice { async this.registerCapability('onoff', CLUSTER.ON_OFF); this.printNode(); 

