'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class tuyalightuniversalDeviceDevice {
  constructor() {
    this.clusterCache = new Map();
  } extends ZigBeeDevice {

  async onNodeInit() {
    try {
    this.printNode();
    
    // Register capabilities
    await this.registerCapabilities();
    
    // Register attribute listeners
    await this.registerAttributeListeners();
    
    // Apply community patches
    await this.applyCommunityPatches();
  }

  async registerCapabilities() {
    try {
    // Register standard capabilities
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff');
    }
    
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl');
    }
    
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 3600,
            minChange: 1,
          },
      });
    }

  async registerAttributeListeners() {
    try {
    // Listen for attribute changes
    this.zclNode.endpoints[1].clusters.genOnOff?.on('attr.onOff', (value) => {
      this.setCapabilityValue('onoff', value === 1);
    });
    
    this.zclNode.endpoints[1].clusters.genPowerCfg?.on('attr.batteryPercentageRemaining', (value) => {
      const batteryThreshold = this.getSetting('batteryThreshold') || 20;
      const percentage = Math.round(value / 2);
      
      this.setCapabilityValue('measure_battery', percentage);
      
      // Low battery warning
      if (percentage <= batteryThreshold) {
        this.homey.notifications.createNotification({
          excerpt: `Low battery warning for ${this.getName()}: ${percentage}%`
        });
      }
    });
  }

  async applyCommunityPatches() {
    try {
    // Apply battery fix for specific devices
    const batteryFix = this.getSetting('batteryFix');
    if (batteryFix) {
      this.log('Applying battery fix patch');
      // Additional battery reporting configuration
    }
    
    // Apply other community patches as needed
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
    this.log('Settings changed:', changedKeys);
    
    if (changedKeys.includes('batteryThreshold')) {
      this.log('Battery threshold changed to:', newSettings.batteryThreshold);
    }
    
    return true;
  }

    } catch (error) {
      this.error("Error in $1:", error);
    }

module.exports = tuyalightuniversalDevice;
