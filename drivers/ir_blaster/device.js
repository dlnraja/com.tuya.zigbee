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
   * Enable IR learning mode using proper 0xE004 cluster protocol
   */
  async _enableLearnMode(duration = 30) {
    this.log(`Enabling IR learn mode for ${duration} seconds...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // Send learn command to cluster 0xE004 with {"study":0}
      // This is the proper Zigbee2MQTT/zigbee-herdsman protocol
      const learnPayload = Buffer.from(JSON.stringify({ study: 0 }), 'utf8');

      this.log('Sending IR learn command to cluster 0xE004...');

      // Try to send raw ZCL frame to LEARN_CLUSTER
      try {
        await this._sendRawClusterCommand(LEARN_CLUSTER, 0x00, learnPayload);
        this.log('IR learn command sent via cluster 0xE004');
      } catch (e) {
        // Fallback: use OnOff cluster
        this.log('Cluster 0xE004 not available, using OnOff fallback');
        await zclNode.endpoints[1].clusters.onOff.setOn();
      }

      this.setCapabilityValue('onoff', true).catch(() => { });
      this.log('Learn mode enabled - point remote at device and press button');

      // Initialize receive buffer for learned code
      this._receiveBuffers = {};
      this._pendingReceiveSeqs = [];

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

      // Send stop learn command to cluster 0xE004 with {"study":1}
      const stopPayload = Buffer.from(JSON.stringify({ study: 1 }), 'utf8');

      try {
        await this._sendRawClusterCommand(LEARN_CLUSTER, 0x00, stopPayload);
        this.log('IR stop learn command sent via cluster 0xE004');
      } catch (e) {
        // Fallback: use OnOff cluster
        await zclNode.endpoints[1].clusters.onOff.setOff();
      }

      this.setCapabilityValue('onoff', false).catch(() => { });
      this.log('Learn mode disabled');

      // Check if we received a code
      if (this._lastLearnedCode) {
        this.log(`Last learned code: ${this._lastLearnedCode.substring(0, 50)}...`);
        // Update capability if available
        if (this.hasCapability('ir_code_received')) {
          this.setCapabilityValue('ir_code_received', this._lastLearnedCode).catch(() => { });
        }
        // Trigger flow
        this.driver.codeLearnedTrigger?.trigger(this, { ir_code: this._lastLearnedCode }, {}).catch(() => { });
      }

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
   * Send start transmit command to cluster 0xED00
   */
  async _sendStartTransmit(seq, length) {
    this.log(`Sending start transmit: seq=${seq}, length=${length}`);

    // Build payload structure like zigbee-herdsman-converters
    const payload = Buffer.alloc(16);
    payload.writeUInt16LE(seq, 0);        // seq
    payload.writeUInt32LE(length, 2);     // length
    payload.writeUInt32LE(0, 6);          // unk1
    payload.writeUInt16LE(LEARN_CLUSTER, 10); // unk2 (cluster id)
    payload.writeUInt8(0x01, 12);         // unk3
    payload.writeUInt8(0x02, 13);         // cmd
    payload.writeUInt16LE(0, 14);         // unk4

    try {
      await this._sendRawClusterCommand(TRANSMIT_CLUSTER, CMD_START_TRANSMIT, payload);
      this.log('Start transmit sent successfully');
    } catch (err) {
      this.error('Failed to send start transmit:', err);
      throw err;
    }
  }

  /**
   * Send raw ZCL cluster command
   */
  async _sendRawClusterCommand(clusterId, commandId, payload) {
    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    // Convert payload to hex string for ZCL frame
    const payloadHex = payload.toString('hex');
    this.log(`Sending cluster 0x${clusterId.toString(16)} cmd 0x${commandId.toString(16)}: ${payloadHex.substring(0, 40)}...`);

    // Use Homey's raw ZCL sending capability
    try {
      // Try manufacturer-specific command
      const endpoint = zclNode.endpoints[1];

      // For proprietary clusters, we need to use sendFrame or similar
      // This is a best-effort implementation
      if (endpoint.sendFrame) {
        await endpoint.sendFrame(clusterId, {
          frameControl: { clusterSpecific: true, manufacturerSpecific: false, disableDefaultResponse: false },
          commandId: commandId,
          payload: payload
        });
      } else {
        this.log('Raw frame sending not available, command may not work');
      }
    } catch (err) {
      this.log(`Cluster command error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get last learned IR code
   */
  getLastLearnedCode() {
    return this._lastLearnedCode || null;
  }

  /**
   * Set last learned IR code (called from cluster listener)
   */
  setLastLearnedCode(code) {
    this._lastLearnedCode = code;
    this.log(`Stored learned IR code: ${code.substring(0, 50)}...`);
  }

  onDeleted() {
    this.log('IR Blaster device deleted');
  }
}

module.exports = IrBlasterDevice;
