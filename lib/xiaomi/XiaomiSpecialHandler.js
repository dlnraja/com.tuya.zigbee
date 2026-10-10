'use strict';

/**
 * XiaomiSpecialHandler - Xiaomi/Lumi Device Special Handling
 * 
 * Inspired by fairecasoimeme/Xiaomi repository
 * Handles Xiaomi-specific attributes and keep-alive
 * 
 * Features:
 * - Attribute 0xFF01 parsing (battery, temp, etc.)
 * - Keep-alive system (hourly ping)
 * - Post-reboot recovery
 * - Battery voltage conversion
 * - Structured data parsing
 */

class XiaomiSpecialHandler {
  
  constructor(device) {
    this.device = device;
    this.lastPing = null;
    this.keepAliveInterval = null;
    this.keepAliveDuration = 3600000; // 1 hour
    
    // Xiaomi manufacturer code
    this.XIAOMI_MANUFACTURER_CODE = 0x115F;
  }
  
  /**
   * Initialize Xiaomi special handling
   */
  async initialize() {
    this.device.log('[Xiaomi] Initializing special handler...');
    
    try {
      // Read Xiaomi special attribute 0xFF01
      await this.readXiaomiSpecialAttribute();
      
      // Start keep-alive ping system
      this.startKeepAlive();
      
      // Post-reboot recovery if needed
      if (this.device.getStoreValue('needs_post_reboot_ping')) {
        await this.postRebootPing();
      }
      
      this.device.log('[Xiaomi] Special handler initialized successfully');
      
    } catch (err) {
      this.device.error('[Xiaomi] Initialization failed:', err);
    }
  }
  
  /**
   * Read Xiaomi special attribute 0xFF01
   */
  async readXiaomiSpecialAttribute() {
    try {
      const endpoint = this.device.zclNode.endpoints[1];
      
      if (!endpoint || !endpoint.clusters.basic) {
        this.device.log('[Xiaomi] No basic cluster available');
        return;
      }
      
      // Read attribute 0xFF01
      const result = await endpoint.clusters.basic.readAttributes([0xFF01]);
      
      if (!result || !result[0xFF01]) {
        this.device.log('[Xiaomi] Attribute 0xFF01 not available');
        return;
      }
      
      // Parse Xiaomi special data
      const data = this.parseXiaomiData(result[0xFF01]);
      
      this.device.log('[Xiaomi] Parsed special attribute:', data);
      
      // Update capabilities
      if (data.battery !== undefined) {
        await this.device.setCapabilityValue('measure_battery', parseFloat(data.battery)).catch(() => {});
      }

      if (data.temperature !== undefined) {
        if (this.device.hasCapability('measure_temperature')) {
          await this.device.setCapabilityValue('measure_temperature', parseFloat(data.temperature)).catch(() => {});
        }
      }
      
      if (data.voltage !== undefined) {
        this.device.setStoreValue('xiaomi_voltage', data.voltage);
      }
      
    } catch (err) {
      this.device.error('[Xiaomi] Read special attribute failed:', err);
    }
  }
  
  /**
   * Parse Xiaomi structured data
   */
  parseXiaomiData(buffer) {
    const data = {};
    
    if (!Buffer.isBuffer(buffer)) {
      return data;
    }
    // Real lumi 0xFF01 / 0xFCC0:0x00F7 payloads are tag + ZCL-datatype + value (not tag + length).
    // Prefer that decoding when the payload conforms; legacy path below stays as fallback.
    const tlv = this.parseLumiTagTypeValue(buffer);
    if (tlv) {
      return tlv;
    }
    
    let pos = 0;
    
    while (pos < buffer.length - 1) {
      try {
        const type = buffer.readUInt8(pos++);
        const length = buffer.readUInt8(pos++);
        
        if (pos + length > buffer.length) {
          break;
        }
        
        const value = buffer.slice(pos, pos + length);
        pos += length;
        
        switch (type) {
        case 0x01: // Battery voltage (mV)
          if (length === 2) {
            data.voltage = value.readUInt16LE(0);
            data.battery = this.voltageToBattery(data.voltage);
          }
          break;
            
        case 0x03: // Temperature (°C * 100)
          if (length === 2) {
            data.temperature = value.readInt16LE(0) / 100;
          }
          break;
            
        case 0x04: // Humidity (%)
          if (length === 2) {
            data.humidity = value.readUInt16LE(0) / 100;
          }
          break;
            
        case 0x05: // Pressure (hPa * 10)
          if (length === 2) {
            data.pressure = value.readUInt16LE(0) / 10;
          }
          break;
            
        case 0x06: // Accelerometer
          if (length === 2) {
            data.accelerometer = value.readInt16LE(0);
          }
          break;
            
        case 0x07: // Lux
          if (length === 4) {
            data.lux = value.readUInt32LE(0);
          }
          break;
            
        case 0x08: // Device temperature (°C)
          if (length === 2) {
            data.deviceTemperature = value.readInt16LE(0);
          }
          break;
            
        case 0x09: // On/Off state
          if (length === 1) {
            data.onoff = !!value.readUInt8(0);
          }
          break;
            
        case 0x0A: // Parent NWK
          if (length === 2) {
            data.parentNwk = value.readUInt16LE(0);
          }
          break;
            
        case 0x64: // Switch type
          if (length === 1) {
            data.switchType = value.readUInt8(0);
          }
          break;
        }
        
      } catch (err) {
        this.device.error('[Xiaomi] Parse error:', err);
        break;
      }
    }
    
    return data;
  }
  
  /**
   * Decode lumi "tag / ZCL datatype / value" structs carried by basic:0xFF01 and
   * manuSpecificLumi(0xFCC0):0x00F7 heartbeats. Layout as documented by zigbee-herdsman-converters
   * (lumi buffer decoder, MIT) and discussed in the Homey "Aqara & Xiaomi" app thread
   * (community.homey.app/t/156). Own implementation. Returns null when the buffer does not conform.
   * Only unambiguous tags are mapped: 0x01 battery mV, 0x03 device temperature (int8 °C).
   * Everything else is kept in data.tags for per-driver use.
   */
  parseLumiTagTypeValue(buffer) {
    const SIZE = { 0x10: 1, 0x20: 1, 0x21: 2, 0x22: 3, 0x23: 4, 0x24: 5, 0x25: 6, 0x28: 1, 0x29: 2, 0x2A: 3, 0x2B: 4, 0x39: 4 };
    if (!Buffer.isBuffer(buffer) || buffer.length < 3) { return null; }
    const tags = {};
    let pos = 0;
    while (pos < buffer.length) {
      if (pos + 2 > buffer.length) { return null; }
      const tag = buffer.readUInt8(pos);
      const type = buffer.readUInt8(pos + 1);
      pos += 2;
      let v;
      if (type === 0x42) { // char string: 1-byte length prefix
        if (pos >= buffer.length) { return null; }
        const n = buffer.readUInt8(pos);
        if (pos + 1 + n > buffer.length) { return null; }
        v = buffer.toString('utf8', pos + 1, pos + 1 + n); pos += 1 + n;
      } else {
        const n = SIZE[type];
        if (!n || pos + n > buffer.length) { return null; }
        if (type === 0x39) { v = buffer.readFloatLE(pos); }
        else if (type >= 0x28 && type <= 0x2B) { v = buffer.readIntLE(pos, n); }
        else { v = buffer.readUIntLE(pos, n); }
        pos += n;
      }
      tags[tag] = v;
    }
    const data = { tags };
    if (typeof tags[0x01] === 'number' && tags[0x01] >= 1500 && tags[0x01] <= 3600) {
      data.voltage = tags[0x01];
      data.battery = this.voltageToBattery(data.voltage);
    }
    if (typeof tags[0x03] === 'number' && tags[0x03] > -40 && tags[0x03] < 100) {
      data.deviceTemperature = tags[0x03];
    }
    return data;
  }

  /** Same struct, newer devices report it as attribute 0x00F7 of lumi cluster 0xFCC0. */
  parseLumiF7(buffer) {
    return this.parseLumiTagTypeValue(buffer) || {};
  }
  
  /**
   * Convert voltage to battery percentage
   * Xiaomi-specific curve
   */
  voltageToBattery(voltage) {
    // CR2032 battery: non-linear discharge curve (v9.0.388: remplace
    // l'interpolation linéaire bannie)
    const UBH = require('../battery/UnifiedBatteryHandler');
    return UBH.calculateFromVoltage(voltage / 1000, 'CR2032');
  }
  
  /**
   * Start keep-alive ping system
   */
  startKeepAlive() {
    if (this.keepAliveInterval) {
      this.device.homey.clearInterval(this.keepAliveInterval);
    }
    
    this.keepAliveInterval = this.device.homey.setInterval(
      () => {
        if (this._destroyed) {return;}
        this.pingDevice();
      },
      this.keepAliveDuration
    );
    
    this.device.log('[Xiaomi] Keep-alive started (interval: 1 hour)');
  }
  
  /**
   * Ping device to keep it alive
   */
  async pingDevice() {
    try {
      const endpoint = this.device.zclNode.endpoints[1];
      
      if (!endpoint || !endpoint.clusters.basic) {
        this.device.error('[Xiaomi] No basic cluster for ping');
        return;
      }
      
      // Simple read attribute to keep device alive
      await endpoint.clusters.basic.readAttributes(['manufacturerName']);
      
      this.lastPing = Date.now();
      this.device.log('[Xiaomi] Keep-alive ping successful');
      
      // Also re-read special attribute periodically
      await this.readXiaomiSpecialAttribute();
      
    } catch (err) {
      this.device.error('[Xiaomi] Keep-alive ping failed:', err);
    }
  }
  
  /**
   * Post-reboot recovery (3 pings with delay)
   */
  async postRebootPing() {
    this.device.log('[Xiaomi] Post-reboot recovery started...');
    
    for (let i = 0; i < 3; i++) {
      await this.sleep(5000); // Wait 5 seconds
      
      await this.pingDevice();
      
      this.device.log(`[Xiaomi] Post-reboot ping ${i + 1}/3`);
    }
    
    // Clear flag
    this.device.setStoreValue('needs_post_reboot_ping', false);
    
    this.device.log('[Xiaomi] Post-reboot recovery complete');
  }
  
  /**
   * Cleanup (stop keep-alive)
   */
  destroy() {
    this._destroyed = true;
    if (this.keepAliveInterval) {
      this.device.homey.clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    this.device.log('[Xiaomi] Special handler destroyed');
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => this.device.homey.setTimeout(resolve, ms));
  }
}

module.exports = XiaomiSpecialHandler;
