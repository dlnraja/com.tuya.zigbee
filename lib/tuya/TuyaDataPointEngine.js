#!/usr/bin/env node
const { safeDivide } = require('../utils/tuyaUtils.js');
'use strict';

/**
 * TuyaDataPointEngine.js
 * 
 * COMPLETE Tuya DataPoint (DP) engine for TS0601 devices
 * Handles ALL Tuya climate sensors, motion sensors, etc.
 * 
 * TS0601 devices use DataPoints instead of standard Zigbee clusters
 */

class TuyaDataPointEngine {
  
  constructor(device, tuyaCluster) {
    this.device = device;
    this.tuyaCluster = tuyaCluster;
    this.dpValues = {}; // Cache of DP values
    
    this.device.log('[TUYA-DP]  Engine initialized');
  }
  
  /**
   * Setup Tuya DataPoint listeners for a TS0601 device
   */
  async setupDataPoints(dpMapping) {
    this.device.log('[TUYA-DP]  Setting up DataPoint listeners...');
    this.device.log('[TUYA-DP]  DP Mapping:', JSON.stringify(dpMapping, null, 2));
    
    try {
      // Listen for DP reports
      this.tuyaCluster.on('reporting', (data) => {
        this.device.log('[TUYA-DP]  REPORTING EVENT:', JSON.stringify(data, null, 2));
        this.handleDataPointReport(data, dpMapping);
      });
      
      this.tuyaCluster.on('response', (data) => {
        this.device.log('[TUYA-DP]  RESPONSE EVENT:', JSON.stringify(data, null, 2));
        this.handleDataPointReport(data, dpMapping);
      });
      
      this.tuyaCluster.on('dataReport', (data) => {
        this.device.log('[TUYA-DP]  DATA REPORT:', JSON.stringify(data, null, 2));
        this.handleDataPointReport(data, dpMapping);
      });
      
      // Try to read initial values
      await this.readAllDataPoints(dpMapping);
      
      this.device.log('[TUYA-DP]  DataPoint listeners configured');
      
    } catch (err) {
      this.device.error('[TUYA-DP]  Setup failed:', err);
      this.device.error('[TUYA-DP] Stack:', err.stack);
    }
  }
  
  /**
   * Handle incoming DataPoint report
   */
  handleDataPointReport(data, dpMapping) {
    this.device.log('[TUYA-DP]  Processing DP report...');
    
    try {
      // Try different possible data structures
      const dpData = data?.dp || data?.datapoints || data?.data || data;
      
      if (Array.isArray(dpData)) {
        // Array of DPs
        dpData.forEach(dp => this.processSingleDP(dp, dpMapping));
      } else if (dpData && typeof dpData === 'object') {
        // Single DP object
        this.processSingleDP(dpData, dpMapping);
      } else {
        this.device.log('[TUYA-DP]   Unknown DP data structure:', JSON.stringify(data, null, 2));
      }
      
    } catch (err) {
      this.device.error('[TUYA-DP]  Report processing failed:', err);
    }
  }
  
  /**
   * Process a single DataPoint
   */
  processSingleDP(dp, dpMapping) {
    const dpId = dp.dp || dp.id || dp.dpid;
    const dpValue = dp.value !== undefined ? dp.value : dp.data;
    const dpType = dp.datatype || dp.type;
    
    this.device.log(`[TUYA-DP]  DP ${dpId}: ${dpValue} (type: ${dpType})`);
    
    // Store value
    if (dpId !== undefined) {
      this.dpValues[dpId] = dpValue;
    }
    
    // Find capability mapping
    for (const [capability, config] of Object.entries(dpMapping)) {
      if (config.dp === dpId) {
        this.device.log(`[TUYA-DP]  DP ${dpId}  ${capability}`);
        
        // Parse value
        let parsedValue = dpValue;
        
        if (config.parser && typeof config.parser === 'function') {
          try {
            parsedValue = config.parser(dpValue);
            this.device.log(`[TUYA-DP]  Parsed: ${dpValue}  ${parsedValue}`);
          } catch (parseErr) {
            this.device.error(`[TUYA-DP]  Parser failed for ${capability}:`, parseErr);
            return;
          }
        }
        
        // Update capability
        this.device.setCapabilityValue(capability, parsedValue)
          .then(() => {
            this.device.log(`[TUYA-DP]  ${capability} = ${parsedValue}`);
          })
          .catch(err => {
            this.device.error(`[TUYA-DP]  Failed to set ${capability}:`, err);
      });
      }
    }
  }
  
  /**
   * Read all DataPoints on init
   */
  async readAllDataPoints(dpMapping) {
    this.device.log('[TUYA-DP]  Reading initial DP values...');
    
    // Collect unique DP IDs
    const dpIds = [...new Set(Object.values(dpMapping).map(c => c.dp))];
    
    this.device.log('[TUYA-DP]  DPs to read:', dpIds.join(', '));
    
    for (const dpId of dpIds) {
      try {
        this.device.log(`[TUYA-DP]  Reading DP ${dpId}...`);
        
        // Try multiple read methods
        let value;
        
        // Method 1: readAttributes
        try {
          const result = await this.tuyaCluster.readAttributes([dpId]).catch(() => null);
          if (result && result[dpId] !== undefined) {
            value = result[dpId];
            this.device.log(`[TUYA-DP]  DP ${dpId} read via readAttributes: ${value}`);
          }
        } catch (readErr) {
          this.device.log(`[TUYA-DP]   readAttributes failed for DP ${dpId}: ${readErr.message}`);
        }
        
        // Method 2: read specific DP command
        if (value === undefined && typeof this.tuyaCluster.readDP === 'function') {
          try {
            value = await this.tuyaCluster.readDP(dpId).catch(() => null);
            if (value !== undefined && value !== null) {
              this.device.log(`[TUYA-DP]  DP ${dpId} read via readDP: ${value}`);
            }
          } catch (cmdErr) {
            this.device.log(`[TUYA-DP]   readDP failed for DP ${dpId}: ${cmdErr.message}`);
          }
        }
        
        // If value obtained, process it
        if (value !== undefined && value !== null) {
          this.processSingleDP({ dp: dpId, value }, dpMapping);
        } else {
          this.device.log(`[TUYA-DP]   Could not read DP ${dpId} - will wait for report`);
        }
        
      } catch (err) {
        this.device.log(`[TUYA-DP]   Error reading DP ${dpId}:`, err.message);
      }
    }
    
    this.device.log('[TUYA-DP]  Initial read complete');
  }
  
  /**
   * Write to a DataPoint
   */
  async writeDataPoint(dpId, value, dataType = 'value') {
    this.device.log(`[TUYA-DP]   Writing DP ${dpId} = ${value} (type: ${dataType})`);
    
    try {
      // Try different write methods
      if (typeof this.tuyaCluster.writeDP === 'function') {
        await this.tuyaCluster.writeDP(dpId, value, dataType);
        this.device.log(`[TUYA-DP]  DP ${dpId} written via writeDP`);
      } else if (typeof this.tuyaCluster.write === 'function') {
        await this.tuyaCluster.write({ dp: dpId, value, datatype: dataType });
        this.device.log(`[TUYA-DP]  DP ${dpId} written via write`);
      } else {
        this.device.log('[TUYA-DP]  No write method available');
      }
      
    } catch (err) {
      this.device.error(`[TUYA-DP]  Write failed for DP ${dpId}:`, err);
      throw err;
    }
  }
  
  /**
   * Get cached DP value
   */
  getDataPoint(dpId) {
    return this.dpValues[dpId];
  }
}

module.exports = TuyaDataPointEngine;


