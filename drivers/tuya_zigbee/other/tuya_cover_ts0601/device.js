'use strict';

const TuyaCoverTS0601 = require('./driver');

class TuyaCoverTS0601Device extends TuyaCoverTS0601 {

  constructor() {
    super();
    
    // Device-specific metadata
    this.deviceMetadata = {
      model: 'TS0601_cover',
      manufacturer: 'Tuya',
      category: 'cover',
      capabilities: ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set'],
      tuyaDps: {
        1: { capability: 'windowcoverings_state', description: 'Cover State', type: 'enum', values: ['open', 'close', 'stop'] },
        2: { capability: 'windowcoverings_set', description: 'Cover Position', type: 'value', range: [0, 100] },
        3: { capability: 'windowcoverings_tilt_set', description: 'Cover Tilt', type: 'value', range: [0, 100] }
      },
      zigbeeModel: 'TS0601_cover',
      endpoints: [1],
      clusters: ['genBasic', 'genIdentify', 'manuSpecificTuya']
    };
  }

  async onNodeInit({ zclNode }) {
    // Call parent initialization
    await super.onNodeInit({ zclNode });
    
    // Configure device-specific settings
    await this._configureTS0601Specific();
    
    // Setup device-specific listeners
    this._setupDeviceSpecificListeners();
    
    this.log('TS0601 Cover device initialized with specific configuration');
  }

  async _configureTS0601Specific() {
    try {
      // Cover-specific configuration
      this.coverConfig = {
        maxPosition: 100,
        minPosition: 0,
        defaultSpeed: this.coverSpeed || 50,
        hasTilt: true,
        tiltRange: [0, 100],
        motorType: 'stepper', // or 'servo'
        reverseDirection: false,
        calibrationMode: false
      };
      
      // Apply configuration
      await this._applyTS0601Configuration();
      
      this.log('TS0601 cover configuration applied:', this.coverConfig);
      
    } catch (error) {
      this.error('Failed to configure TS0601 specific settings:', error);
    }
  }

  async _applyTS0601Configuration() {
    try {
      // Set default position if not set
      const currentPosition = await this.getCapabilityValue('windowcoverings_set');
      if (currentPosition === null || currentPosition === undefined) {
        await this.setCapabilityValue('windowcoverings_set', 0);
        this.log('Set default cover position to 0%');
      }
      
      // Set default tilt if not set
      const currentTilt = await this.getCapabilityValue('windowcoverings_tilt_set');
      if (currentTilt === null || currentTilt === undefined) {
        await this.setCapabilityValue('windowcoverings_tilt_set', 0);
        this.log('Set default cover tilt to 0%');
      }
      
      // Set default state
      await this.setCapabilityValue('windowcoverings_state', 'close');
      
    } catch (error) {
      this.error('Failed to apply TS0601 configuration:', error);
    }
  }

  _setupDeviceSpecificListeners() {
    // Listen for capability changes
    this.on('capability.windowcoverings_set', async (value) => {
      await this._validateTS0601Position(value);
    });
    
    this.on('capability.windowcoverings_tilt_set', async (value) => {
      await this._validateTS0601Tilt(value);
    });
    
    // Listen for state changes
    this.on('capability.windowcoverings_state', async (value) => {
      await this._validateTS0601State(value);
    });
  }

  async _validateTS0601Position(position) {
    try {
      // Validate position range
      if (position < this.coverConfig.minPosition || position > this.coverConfig.maxPosition) {
        this.log(`Invalid position ${position}%, clamping to valid range`);
        const clampedPosition = Math.max(this.coverConfig.minPosition, 
                                       Math.min(this.coverConfig.maxPosition, position));
        await this.setCapabilityValue('windowcoverings_set', clampedPosition);
        return;
      }
      
      // Update state based on position
      let newState = 'close';
      if (position === 0) {
        newState = 'close';
      } else if (position === 100) {
        newState = 'open';
      } else {
        newState = 'open'; // Partially open
      }
      
      await this.setCapabilityValue('windowcoverings_state', newState);
      
      this.log(`Cover position validated: ${position}%, state: ${newState}`);
      
    } catch (error) {
      this.error('Error validating cover position:', error);
    }
  }

  async _validateTS0601Tilt(tilt) {
    try {
      // Validate tilt range
      if (tilt < this.coverConfig.tiltRange[0] || tilt > this.coverConfig.tiltRange[1]) {
        this.log(`Invalid tilt ${tilt}%, clamping to valid range`);
        const clampedTilt = Math.max(this.coverConfig.tiltRange[0], 
                                    Math.min(this.coverConfig.tiltRange[1], tilt));
        await this.setCapabilityValue('windowcoverings_tilt_set', clampedTilt);
        return;
      }
      
      this.log(`Cover tilt validated: ${tilt}%`);
      
    } catch (error) {
      this.error('Error validating cover tilt:', error);
    }
  }

  async _validateTS0601State(state) {
    try {
      // Validate state values
      const validStates = ['open', 'close', 'stop'];
      if (!validStates.includes(state)) {
        this.log(`Invalid state ${state}, using 'close'`);
        await this.setCapabilityValue('windowcoverings_state', 'close');
        return;
      }
      
      // Update position based on state
      if (state === 'close') {
        await this.setCapabilityValue('windowcoverings_set', 0);
      } else if (state === 'open') {
        await this.setCapabilityValue('windowcoverings_set', 100);
      }
      // 'stop' doesn't change position
      
      this.log(`Cover state validated: ${state}`);
      
    } catch (error) {
      this.error('Error validating cover state:', error);
    }
  }

  async getTS0601Diagnostics() {
    try {
      const diagnostics = {
        deviceId: this.getData().id,
        model: this.deviceMetadata.model,
        manufacturer: this.deviceMetadata.manufacturer,
        capabilities: await this.getCapabilities(),
        position: await this.getCapabilityValue('windowcoverings_set'),
        tilt: await this.getCapabilityValue('windowcoverings_tilt_set'),
        state: await this.getCapabilityValue('windowcoverings_state'),
        config: this.coverConfig,
        tuyaDps: this.deviceMetadata.tuyaDps,
        lastSeen: new Date().toISOString(),
        uptime: process.uptime()
      };
      
      return diagnostics;
      
    } catch (error) {
      this.error('Failed to get diagnostics:', error);
      return { error: error.message };
    }
  }

  async updateTS0601Config(newConfig) {
    try {
      // Merge new config with existing
      this.coverConfig = { ...this.coverConfig, ...newConfig };
      
      // Apply updated configuration
      await this._applyTS0601Configuration();
      
      this.log('TS0601 configuration updated:', this.coverConfig);
      
      return true;
      
    } catch (error) {
      this.error('Failed to update TS0601 configuration:', error);
      return false;
    }
  }

  onDeleted() {
    this.log('TS0601 Cover device deleted');
    super.onDeleted();
  }
}

module.exports = TuyaCoverTS0601Device;
