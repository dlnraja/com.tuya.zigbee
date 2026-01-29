'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

const TUYA_CLUSTER_ID = 0xEF00;

// Tuya DP definitions for Fingerbot
const DP_SWITCH = 1;        // Push action (on/off)
const DP_MODE = 101;        // Mode: 0=click, 1=switch, 2=program
const DP_LOWER = 102;       // Down movement limit (50-100)
const DP_UPPER = 103;       // Up movement limit (0-50)
const DP_DELAY = 104;       // Sustain time (0-10s)
const DP_REVERSE = 105;     // Reverse direction
const DP_BATTERY = 106;     // Battery percentage
const DP_TOUCH = 107;       // Touch detection

class FingerbotDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('Fingerbot device initialized');

    // Register onoff capability for push action
    this.registerCapability('onoff', TUYA_CLUSTER_ID, {
      set: async (value) => {
        this.log(`[Fingerbot] Push action: ${value ? 'ON' : 'OFF'}`);
        await this.sendTuyaDP(DP_SWITCH, 'bool', value);
      },
      get: async () => {
        return this.getCapabilityValue('onoff') || false;
      },
      report: async (value) => {
        this.log(`[Fingerbot] State report: ${value}`);
        return value;
      }
    });

    // Register button.push capability
    if (this.hasCapability('button.push')) {
      this.registerCapabilityListener('button.push', async () => {
        this.log('[Fingerbot] Manual push triggered');
        await this.sendTuyaDP(DP_SWITCH, 'bool', true);
        // Auto-reset after delay
        setTimeout(async () => {
          await this.setCapabilityValue('onoff', false).catch(this.error);
        }, 1000);
      });
    }

    // Listen for Tuya DP reports
    this.registerTuyaDPListener();

    // Apply settings on init
    await this.applySettings();
  }

  registerTuyaDPListener() {
    const node = this.zclNode;
    if (!node || !node.endpoints || !node.endpoints[1]) {
      this.log('[Fingerbot] No endpoint 1 available for DP listener');
      return;
    }

    const tuyaCluster = node.endpoints[1].clusters[TUYA_CLUSTER_ID];
    if (!tuyaCluster) {
      this.log('[Fingerbot] Tuya cluster EF00 not available');
      return;
    }

    tuyaCluster.on('response', (frame) => {
      this.handleTuyaDPReport(frame);
    });

    this.log('[Fingerbot] Tuya DP listener registered');
  }

  handleTuyaDPReport(frame) {
    if (!frame || !frame.data) return;

    const data = frame.data;
    let offset = 0;

    while (offset < data.length - 4) {
      const dp = data[offset];
      const type = data[offset + 1];
      const len = (data[offset + 2] << 8) | data[offset + 3];
      const value = this.extractDPValue(data, offset + 4, type, len);

      this.log(`[Fingerbot] DP ${dp} = ${value} (type ${type})`);

      switch (dp) {
        case DP_SWITCH:
          this.setCapabilityValue('onoff', !!value).catch(this.error);
          break;
        case DP_BATTERY:
          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', value).catch(this.error);
          }
          break;
        case DP_TOUCH:
          this.log(`[Fingerbot] Touch detected: ${value}`);
          break;
        case DP_MODE:
          this.log(`[Fingerbot] Mode: ${['click', 'switch', 'program'][value] || value}`);
          break;
      }

      offset += 4 + len;
    }
  }

  extractDPValue(data, offset, type, len) {
    switch (type) {
      case 0x00: // Raw
        return data.slice(offset, offset + len);
      case 0x01: // Boolean
        return data[offset] === 1;
      case 0x02: // Value (4 bytes)
        return (data[offset] << 24) | (data[offset + 1] << 16) | 
               (data[offset + 2] << 8) | data[offset + 3];
      case 0x03: // String
        return String.fromCharCode(...data.slice(offset, offset + len));
      case 0x04: // Enum
        return data[offset];
      case 0x05: // Bitmap
        return data.slice(offset, offset + len);
      default:
        return data.slice(offset, offset + len);
    }
  }

  async sendTuyaDP(dp, type, value) {
    const node = this.zclNode;
    if (!node || !node.endpoints || !node.endpoints[1]) {
      this.error('[Fingerbot] Cannot send DP: no endpoint');
      return;
    }

    const tuyaCluster = node.endpoints[1].clusters[TUYA_CLUSTER_ID];
    if (!tuyaCluster) {
      this.error('[Fingerbot] Cannot send DP: no Tuya cluster');
      return;
    }

    let payload;
    switch (type) {
      case 'bool':
        payload = Buffer.from([dp, 0x01, 0x00, 0x01, value ? 0x01 : 0x00]);
        break;
      case 'enum':
        payload = Buffer.from([dp, 0x04, 0x00, 0x01, value]);
        break;
      case 'value':
        payload = Buffer.from([
          dp, 0x02, 0x00, 0x04,
          (value >> 24) & 0xFF,
          (value >> 16) & 0xFF,
          (value >> 8) & 0xFF,
          value & 0xFF
        ]);
        break;
      default:
        this.error(`[Fingerbot] Unknown DP type: ${type}`);
        return;
    }

    try {
      const seqNr = this._tuyaSeqNr = ((this._tuyaSeqNr || 0) + 1) & 0xFFFF;
      const frame = Buffer.concat([
        Buffer.from([0x00, (seqNr >> 8) & 0xFF, seqNr & 0xFF]),
        payload
      ]);

      await tuyaCluster.writeAttributes({ datapoints: frame });
      this.log(`[Fingerbot] Sent DP ${dp} = ${value}`);
    } catch (err) {
      this.error(`[Fingerbot] Failed to send DP ${dp}:`, err);
    }
  }

  async applySettings() {
    const mode = this.getSetting('fingerbot_mode');
    const lower = this.getSetting('lower_limit');
    const upper = this.getSetting('upper_limit');
    const delay = this.getSetting('sustain_time');
    const reverse = this.getSetting('reverse_direction');

    if (mode !== undefined) {
      const modeValue = { click: 0, switch: 1, program: 2 }[mode] || 0;
      await this.sendTuyaDP(DP_MODE, 'enum', modeValue);
    }

    if (lower !== undefined) {
      await this.sendTuyaDP(DP_LOWER, 'value', lower);
    }

    if (upper !== undefined) {
      await this.sendTuyaDP(DP_UPPER, 'value', upper);
    }

    if (delay !== undefined) {
      await this.sendTuyaDP(DP_DELAY, 'value', delay);
    }

    if (reverse !== undefined) {
      await this.sendTuyaDP(DP_REVERSE, 'bool', reverse);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[Fingerbot] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      switch (key) {
        case 'fingerbot_mode':
          const modeValue = { click: 0, switch: 1, program: 2 }[newSettings.fingerbot_mode] || 0;
          await this.sendTuyaDP(DP_MODE, 'enum', modeValue);
          break;
        case 'lower_limit':
          await this.sendTuyaDP(DP_LOWER, 'value', newSettings.lower_limit);
          break;
        case 'upper_limit':
          await this.sendTuyaDP(DP_UPPER, 'value', newSettings.upper_limit);
          break;
        case 'sustain_time':
          await this.sendTuyaDP(DP_DELAY, 'value', newSettings.sustain_time);
          break;
        case 'reverse_direction':
          await this.sendTuyaDP(DP_REVERSE, 'bool', newSettings.reverse_direction);
          break;
      }
    }
  }

  onDeleted() {
    this.log('Fingerbot device deleted');
  }
}

module.exports = FingerbotDevice;
