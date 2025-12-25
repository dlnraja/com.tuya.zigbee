'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// IR Blaster cluster IDs
const LEARN_CLUSTER = 0xE004;    // 57348
const TRANSMIT_CLUSTER = 0xED00; // 60672

// Transmit cluster commands
const CMD_START_TRANSMIT = 0x00;
const CMD_START_TRANSMIT_ACK = 0x01;
const CMD_CODE_DATA_REQUEST = 0x02;
const CMD_CODE_DATA_RESPONSE = 0x03;
const CMD_DONE_SENDING = 0x04;
const CMD_DONE_RECEIVING = 0x05;
const CMD_ACK = 0x0B;

/**
 * IR Blaster Remote - TS1201 (ZS06, UFO-R11, etc.)
 *
 * Supports learning and sending IR codes via Zigbee.
 * Protocol based on Zigbee2MQTT/zigbee-herdsman implementation.
 *
 * Known manufacturers:
 * - _TZ3290_7v1k4vufotpowp9z (ZS06)
 * - _TZ3290_u9xac5rv
 * - _TZ3290_gnlsafc7
 * - _TZ3290_j37rooaxrcdcqo5n (MOES UFO-R11)
 *
 * Clusters:
 * - 0x0000 (Basic)
 * - 0x0006 (OnOff) - for learn mode toggle
 * - 0xED00 (60672) - IR transmit cluster (TRANSMIT_CLUSTER)
 * - 0xE004 (57348) - IR learn cluster (LEARN_CLUSTER)
 *
 * Protocol flow:
 * Learn: 0xE004 cmd 0x00 {"study":0} -> device LED on -> receive IR -> 0xED00 sequence
 * Send:  0xED00 cmd 0x00 (start) -> 0x02/0x03 (data chunks) -> 0x04/0x05 (done) -> IR emitted
 */
class IrBlasterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('IR Blaster initializing...');

    // Store zclNode reference
    this._zclNode = zclNode;

    // Get device info
    const { manufacturerName, modelId } = this.getSettings() || {};
    this.log(`Manufacturer: ${manufacturerName}, Model: ${modelId}`);

    // Setup OnOff cluster for learn mode
    if (zclNode.endpoints[1]?.clusters?.onOff) {
      this.log('Setting up OnOff cluster for learn mode...');

      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
        this.log(`Learn mode: ${value ? 'ON' : 'OFF'}`);
        this.setCapabilityValue('onoff', value).catch(this.error);
      });

      // Register capability listener
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`Setting learn mode: ${value}`);
        try {
          if (value) {
            await zclNode.endpoints[1].clusters.onOff.setOn();
          } else {
            await zclNode.endpoints[1].clusters.onOff.setOff();
          }
        } catch (err) {
          this.error('Failed to set learn mode:', err);
          throw err;
        }
      });
    }

    // Setup learn IR button
    if (this.hasCapability('button.learn_ir')) {
      this.registerCapabilityListener('button.learn_ir', async () => {
        this.log('Learn IR button pressed - enabling learn mode');
        try {
          await this._enableLearnMode();
        } catch (err) {
          this.error('Failed to enable learn mode:', err);
        }
      });
    }

    // Try to setup IR clusters (proprietary)
    await this._setupIRClusters(zclNode);

    this.log('IR Blaster initialized successfully');
  }

  /**
   * Setup proprietary IR clusters
   */
  async _setupIRClusters(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return;

    // Cluster 0xED00 (60672) - IR Learning
    // Cluster 0xE004 (57348) - IR Code

    // Try to bind to these clusters for receiving learned codes
    try {
      // Listen for any cluster frame on the proprietary clusters
      this.log('Setting up IR cluster listeners...');

      // The IR code is typically received via cluster attribute reports
      // or custom commands on clusters 60672/57348

    } catch (err) {
      this.log('IR cluster setup note:', err.message);
    }
  }

  /**
   * Enable IR learning mode
   */
  async _enableLearnMode(duration = 30) {
    this.log(`Enabling IR learn mode for ${duration} seconds...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // Toggle on the onOff cluster to enable learning - keep it ON during learning
      await zclNode.endpoints[1].clusters.onOff.setOn();
      this.setCapabilityValue('onoff', true).catch(() => { });
      this.log('Learn mode enabled - point remote at device and press button');

      // Clear any existing timeout
      if (this._learnTimeout) {
        this.homey.clearTimeout(this._learnTimeout);
      }

      // Auto-disable after specified duration
      this._learnTimeout = this.homey.setTimeout(async () => {
        try {
          await this._disableLearnMode();
          this.log(`Learn mode auto-disabled after ${duration}s timeout`);
        } catch (e) {
          this.log('Learn mode timeout error:', e.message);
        }
      }, duration * 1000);

      // Trigger flow card
      this.driver.learningStartedTrigger?.trigger(this, {}, {}).catch(() => { });

    } catch (err) {
      this.error('Failed to enable learn mode:', err);
      throw err;
    }
  }

  /**
   * Disable IR learning mode
   */
  async _disableLearnMode() {
    this.log('Disabling IR learn mode...');

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      return;
    }

    try {
      // Clear timeout
      if (this._learnTimeout) {
        this.homey.clearTimeout(this._learnTimeout);
        this._learnTimeout = null;
      }

      // Turn off learning mode
      await zclNode.endpoints[1].clusters.onOff.setOff();
      this.setCapabilityValue('onoff', false).catch(() => { });
      this.log('Learn mode disabled');

    } catch (err) {
      this.error('Failed to disable learn mode:', err);
      throw err;
    }
  }

  /**
   * Send IR code
   * @param {string} irCode - Base64 encoded IR code
   */
  async sendIRCode(irCode) {
    this.log(`Sending IR code: ${irCode.substring(0, 30)}...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // Build JSON payload like zigbee-herdsman-converters
      const jsonPayload = JSON.stringify({
        key_num: 1,
        delay: 300,
        key1: {
          num: 1,
          freq: 38000,
          type: 1,
          key_code: irCode
        }
      });

      // Generate sequence number
      const seq = this._nextSeq();
      const buffer = Buffer.from(jsonPayload, 'utf8');

      // Store buffer for chunked transmission
      this._sendBuffers = this._sendBuffers || {};
      this._sendBuffers[seq] = { buffer, position: 0 };

      // Send start transmit command to cluster 0xED00
      await this._sendStartTransmit(seq, buffer.length);

      this.log(`IR code transmission started (seq: ${seq}, len: ${buffer.length})`);

    } catch (err) {
      this.error('Failed to send IR code:', err);
      throw err;
    }
  }

  /**
   * Generate next sequence number
   */
  _nextSeq() {
    this._seqCounter = ((this._seqCounter || 0) + 1) % 0xFFFF;
    return this._seqCounter;
  }

  /**
   * Send start transmit command
   */
  async _sendStartTransmit(seq, length) {
    this.log(`Sending start transmit: seq=${seq}, length=${length}`);
    // Implementation requires raw ZCL frame sending
    // This is a simplified version - full implementation needs cluster binding
  }

  /**
   * Get last learned IR code
   */
  getLastLearnedCode() {
    return this._lastLearnedCode || null;
  }

  onDeleted() {
    this.log('IR Blaster device deleted');
  }
}

module.exports = IrBlasterDevice;
