'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster } = require('zigbee-clusters');

class TuyaGenericSwitchDeviceDevice {
  constructor() {
    this.clusterCache = new Map();
  } extends ZigBeeDevice {

  async onNodeInit() {
    await super.onNodeInit();

    this.printNode();
    
    // Initialize capabilities based on device type
    await this.initializeCapabilities();
    
    // Configure clusters
    await this.configureClusters();
    
    this.log('Generic Tuya Switch (1-6 gangs) initialized successfully');
  }

  async initializeCapabilities() {
    const capabilities = [
    "onoff"
];
    
    for (const capability of capabilities) {
      if (this.hasCapability(capability)) {
        await this.setupCapability(capability);
      }
  }

  async setupCapability(capability) {
    switch (capability) {
      case 'onoff':
        this.registerCapabilityListener('onoff', async (value) => {
          return this.zclNode.endpoints[this.getClusterEndpoint('genOnOff')]
            .clusters.onOff.setOn(value);
        });
        break;
        
      case 'dim':
        this.registerCapabilityListener('dim', async (value) => {
          return this.zclNode.endpoints[this.getClusterEndpoint('genLevelCtrl')]
            .clusters.levelControl.moveToLevelWithOnOff({
              level: Math.round(value * 254),
              transitionTime: 1
            });
        break;
        
      case 'light_temperature':
        this.registerCapabilityListener('light_temperature', async (value) => {
          const colorTemp = Math.round(1000000 / value);
          return this.zclNode.endpoints[this.getClusterEndpoint('lightingColorCtrl')]
            .clusters.colorControl.moveToColorTemp({
              colorTemperature: colorTemp,
              transitionTime: 10
            });
        break;
        
      case 'light_hue':
        this.registerCapabilityListener('light_hue', async (value) => {
          const hue = Math.round(value * 254);
          return this.zclNode.endpoints[this.getClusterEndpoint('lightingColorCtrl')]
            .clusters.colorControl.moveToHue({
              hue: hue,
              direction: 0,
              transitionTime: 10
            });
        break;
        
      default:
        this.log('Unknown capability:', capability);
    }

  async configureClusters() {
    const clusters = [
    "genBasic",
    "genOnOff"
];
    
    for (const clusterName of clusters) {
      await this.configureCluster(clusterName);
    }

  async configureCluster(clusterName) {
    try {
      const endpoint = this.getClusterEndpoint(clusterName);
      const cluster = this.zclNode.endpoints[endpoint].clusters[this.getClusterKey(clusterName)];
      
      if (cluster) {
        await this.setupClusterReporting(clusterName, cluster);
      }
    } catch (error) {
      this.error('Error configuring cluster', clusterName, error);
    }

  async setupClusterReporting(clusterName, cluster) {
    switch (clusterName) {
      case 'genOnOff':
        cluster.on('attr.onOff', (value) => {
          this.setCapabilityValue('onoff', value).catch(this.error);
        });
        break;
        
      case 'genLevelCtrl':
        cluster.on('attr.currentLevel', (value) => {
          this.setCapabilityValue('dim', value / 254).catch(this.error);
        });
        break;
        
      case 'msTemperatureMeasurement':
        cluster.on('attr.measuredValue', (value) => {
          this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
        });
        break;
        
      case 'msRelativeHumidity':
        cluster.on('attr.measuredValue', (value) => {
          this.setCapabilityValue('measure_humidity', value / 100).catch(this.error);
        });
        break;
    }

  getClusterEndpoint(clusterName) {
    // Generic endpoint detection
    const endpoints = Object.keys(this.getClusterEndpoints());
    return parseInt(endpoints[0]) || 1;
  }

  getClusterKey(clusterName) {
    const mapping = {
      'genBasic': 'basic',
      'genOnOff': 'onOff',
      'genLevelCtrl': 'levelControl',
      'lightingColorCtrl': 'colorControl',
      'msTemperatureMeasurement': 'temperatureMeasurement',
      'msRelativeHumidity': 'relativeHumidity',
      'haElectricalMeasurement': 'electricalMeasurement',
      'seMetering': 'metering'
    };
    
    return mapping[clusterName] || clusterName;
  }

}

module.exports = TuyaGenericSwitchDevice;