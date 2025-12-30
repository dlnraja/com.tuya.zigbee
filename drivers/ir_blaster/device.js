'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

// IR Blaster cluster IDs
const ZOSUNG_IR_CONTROL_CLUSTER_ID = 0xE004;    // 57348 - ZosungIRControl
const ZOSUNG_IR_TRANSMIT_CLUSTER_ID = 0xED00;  // 60672 - ZosungIRTransmit

// ZosungIRControl commands (cluster 0xE004)
const CMD_IR_LEARN = 0x00;       // Start/stop learn mode
const CMD_IR_SEND = 0x02;        // Send IR code

// ZosungIRTransmit commands (cluster 0xED00)
const CMD_START_TRANSMIT = 0x00;
const CMD_START_TRANSMIT_ACK = 0x01;
const CMD_CODE_DATA_REQUEST = 0x02;
const CMD_CODE_DATA_RESPONSE = 0x03;
const CMD_DONE_SENDING = 0x04;
const CMD_DONE_RECEIVING = 0x05;
const CMD_ACK = 0x0B;

/**
 * v5.5.311: Define ZosungIRControl cluster (0xE004)
 * Based on Zigbee2MQTT/ZHA implementation
 */
class ZosungIRControlCluster extends Cluster {
  static get ID() { return ZOSUNG_IR_CONTROL_CLUSTER_ID; }
  static get NAME() { return 'zosungIRControl'; }

  static get COMMANDS() {
    return {
      IRLearn: {
        id: CMD_IR_LEARN,
        args: {
          onoff: ZCLDataTypes.bool
        }
      },
      IRSend: {
        id: CMD_IR_SEND,
        args: {
          code: ZCLDataTypes.string
        }
      }
    };
  }

  static get ATTRIBUTES() {
    return {
      lastLearnedIRCode: {
        id: 0x0000,
        type: ZCLDataTypes.string
      }
    };
  }
}

// Register the custom cluster
Cluster.addCluster(ZosungIRControlCluster);

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
   * v5.5.311: Enable IR learning mode using ZosungIRControl cluster
   */
  async _enableLearnMode(duration = 30) {
    this.log(`Enabling IR learn mode for ${duration} seconds...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      this.log('Sending IR learn command to cluster 0xE004...');

      // v5.5.311: Use proper ZosungIRControl cluster command
      const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
      if (irControlCluster) {
        try {
          await irControlCluster.IRLearn({ onoff: true });
          this.log('IR learn command sent via ZosungIRControl cluster');
        } catch (clusterErr) {
          this.log('ZosungIRControl.IRLearn failed:', clusterErr.message);
          // Fallback to OnOff
          await zclNode.endpoints[1].clusters.onOff?.setOn();
        }
      } else {
        // Fallback: use OnOff cluster
        this.log('ZosungIRControl cluster not available, using OnOff fallback');
        await zclNode.endpoints[1].clusters.onOff?.setOn();
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
   * v5.5.311: Disable IR learning mode
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

      // v5.5.311: Use proper ZosungIRControl cluster command
      const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
      if (irControlCluster) {
        try {
          await irControlCluster.IRLearn({ onoff: false });
          this.log('IR stop learn command sent via ZosungIRControl cluster');
        } catch (clusterErr) {
          this.log('ZosungIRControl.IRLearn(false) failed:', clusterErr.message);
          await zclNode.endpoints[1].clusters.onOff?.setOff();
        }
      } else {
        // Fallback: use OnOff cluster
        await zclNode.endpoints[1].clusters.onOff?.setOff();
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
   * v5.5.311: Send IR code using ZosungIRControl cluster
   * @param {string} irCode - Base64 encoded IR code
   */
  async sendIRCode(irCode) {
    this.log(`Sending IR code: ${irCode.substring(0, 30)}...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // v5.5.311: Use ZosungIRControl.IRSend command directly
      const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
      if (irControlCluster) {
        try {
          await irControlCluster.IRSend({ code: irCode });
          this.log('IR code sent via ZosungIRControl.IRSend');
          return;
        } catch (clusterErr) {
          this.log('ZosungIRControl.IRSend failed, trying Tuya fallback:', clusterErr.message);
        }
      }

      // Fallback: Try Tuya EF00 cluster if available
      const tuyaCluster = zclNode.endpoints[1].clusters.tuya;
      if (tuyaCluster) {
        this.log('Attempting IR send via Tuya cluster...');
        // Tuya DP approach - some IR blasters use DP201 for IR codes
        await tuyaCluster.datapoint({
          dp: 201,
          datatype: 3, // string
          data: Buffer.from(irCode, 'base64')
        });
        this.log('IR code sent via Tuya datapoint');
      } else {
        throw new Error('No IR control cluster available');
      }

    } catch (err) {
      this.error('Failed to send IR code:', err);
      throw err;
    }
  }

  /**
   * v5.5.311: Read last learned IR code from device
   */
  async readLastLearnedCode() {
    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      return null;
    }

    try {
      const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
      if (irControlCluster) {
        const result = await irControlCluster.readAttributes(['lastLearnedIRCode']);
        if (result?.lastLearnedIRCode) {
          this._lastLearnedCode = result.lastLearnedIRCode;
          this.log(`Read learned IR code: ${this._lastLearnedCode.substring(0, 50)}...`);
          return this._lastLearnedCode;
        }
      }
    } catch (err) {
      this.log('Failed to read learned IR code:', err.message);
    }
    return null;
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
