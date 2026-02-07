'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

// v5.8.52: Import Zosung clusters (registered at app startup in registerClusters.js)
const ZosungIRControlCluster = require('../../lib/clusters/ZosungIRControlCluster');
const ZosungIRTransmitCluster = require('../../lib/clusters/ZosungIRTransmitCluster');

// IR Blaster cluster IDs
const ZOSUNG_IR_CONTROL_CLUSTER_ID = 0xE004;    // 57348 - ZosungIRControl
const ZOSUNG_IR_TRANSMIT_CLUSTER_ID = 0xED00;  // 60672 - ZosungIRTransmit

// ZosungIRControl command IDs (for raw frame handling)
const CMD_IR_LEARN = 0x00;

// ZosungIRTransmit commands (cluster 0xED00)
const CMD_START_TRANSMIT = 0x00;
const CMD_START_TRANSMIT_ACK = 0x01;
const CMD_CODE_DATA_REQUEST = 0x02;
const CMD_CODE_DATA_RESPONSE = 0x03;
const CMD_DONE_SENDING = 0x04;
const CMD_DONE_RECEIVING = 0x05;
const CMD_ACK = 0x0B;

// v5.5.356: IR Protocol constants from research
const IR_PROTOCOLS = {
  UNKNOWN: 0,
  NEC: 1,
  RC5: 2,
  RC6: 3,
  SONY: 4,
  SAMSUNG: 5,
  JVC: 6,
  PANASONIC: 7,
  SHARP: 8,
  PRONTOHEX: 9
};

const IR_FREQUENCIES = {
  DEFAULT: 38000,
  MIN: 30000,
  MAX: 45000,
  COMMON: [36000, 37000, 38000, 40000, 56000]
};

// v5.5.356: Learning states
const LEARNING_STATES = {
  IDLE: 0,
  LEARNING: 1,
  SUCCESS: 2,
  TIMEOUT: 3,
  ERROR: 4
};

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

    // v5.5.356: Initialize enhanced IR storage system
    this._learnedCodes = this.getStoreValue('learned_codes') || {};
    this._codeCategories = this.getStoreValue('code_categories') || {};
    this._codeMetadata = this.getStoreValue('code_metadata') || {};
    this._codeNames = Object.keys(this._learnedCodes);
    this._learningState = LEARNING_STATES.IDLE;
    this._protocolAnalysis = {};
    this._deviceCapabilities = null;

    // Store zclNode reference
    this._zclNode = zclNode;

    // Get device info
    const { manufacturerName, modelId } = this.getSettings() || {};
    this.log(`Manufacturer: ${manufacturerName}, Model: ${modelId}`);

    // v5.5.356: Setup enhanced IR clusters first
    await this._setupAdvancedIRClusters(zclNode);

    // v5.8.2: ALWAYS register onoff capability listener (Forum #1349 FrankP)
    // Previously only registered if onOff cluster existed, causing "Missing Capability Listener: onoff" error
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`Setting learn mode: ${value}`);
        try {
          if (value) {
            await this._enableAdvancedLearnMode();
          } else {
            await this._disableLearnMode();
          }
        } catch (err) {
          this.error('Failed to set learn mode:', err);
          throw err;
        }
      });
      this.log('[IR-INIT] ✅ onoff capability listener registered');
    }

    // Setup OnOff cluster for learn mode attribute reports (if available)
    if (zclNode.endpoints[1]?.clusters?.onOff) {
      this.log('Setting up OnOff cluster for learn mode...');

      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
        this.log(`Learn mode: ${value ? 'ON' : 'OFF'}`);
        this._learningState = value ? LEARNING_STATES.LEARNING : LEARNING_STATES.IDLE;
        this.setCapabilityValue('onoff', value).catch(this.error);

        // v5.5.356: Trigger learning state changed flow
        this._triggerLearningStateChanged(this._learningState);
      });
    }

    // v5.5.356: Setup enhanced capability listeners
    await this._setupEnhancedCapabilities();

    // Setup flow card actions
    this.registerFlowCardActions();

    // v5.5.356: Initialize protocol detection
    await this._initializeProtocolDetection();

    // v5.5.356: Setup advanced cluster listeners
    await this._setupAdvancedClusterListeners(zclNode);

    this.log('IR Blaster initialized successfully with enhanced features');
  }

  /**
   * v5.5.356: Setup advanced IR clusters with enhanced protocol support
   */
  async _setupAdvancedIRClusters(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.log('[IR-SETUP] ⚠️ Endpoint 1 not available');
      return;
    }

    this.log('[IR-SETUP] Setting up advanced IR clusters...');
    this.log('[IR-SETUP] Available clusters:', Object.keys(endpoint.clusters || {}));

    try {
      // Setup ZosungIRControl cluster (0xE004)
      const irControlCluster = endpoint.clusters.zosungIRControl;
      if (irControlCluster) {
        this.log('[IR-SETUP] ✅ ZosungIRControl cluster (0xE004) available');

        // Listen for learning status changes
        irControlCluster.on('attr.learningStatus', (status) => {
          this._handleLearningStatusChange(status);
        });

        // Listen for learned code attribute
        irControlCluster.on('attr.lastLearnedIRCode', (code) => {
          this._handleLearnedCode(code);
        });

        // Read device capabilities
        try {
          const capabilities = await irControlCluster.readAttributes([
            'supportedProtocols', 'carrierFrequency', 'maxCodeLength'
          ]);
          this._deviceCapabilities = capabilities;
          this.log('IR device capabilities:', capabilities);
        } catch (readErr) {
          this.log('Could not read IR capabilities:', readErr.message);
        }
      } else {
        this.log('[IR-SETUP] ⚠️ ZosungIRControl cluster NOT available - will use OnOff fallback');
      }

      // Setup ZosungIRTransmit cluster (0xED00)
      const irTransmitCluster = endpoint.clusters.zosungIRTransmit;
      if (irTransmitCluster) {
        this.log('[IR-SETUP] ✅ ZosungIRTransmit cluster (0xED00) available');
        this._irTransmitCluster = irTransmitCluster;

        // Setup transmit protocol listeners
        this._setupTransmitProtocol(irTransmitCluster);
      } else {
        this.log('[IR-SETUP] ⚠️ ZosungIRTransmit cluster NOT available');
      }

    } catch (err) {
      this.log('[IR-SETUP] ❌ Advanced IR cluster setup error:', err.message);
    }
  }

  /**
   * v5.5.356: Setup enhanced capabilities from SDK research
   */
  async _setupEnhancedCapabilities() {
    // Setup learn IR button with advanced options
    if (this.hasCapability('button.learn_ir')) {
      this.registerCapabilityListener('button.learn_ir', async () => {
        await this._enableAdvancedLearnMode();
      });
    }

    // Setup protocol selection capability if available
    if (this.hasCapability('ir_protocol')) {
      this.registerCapabilityListener('ir_protocol', async (protocol) => {
        await this._setIRProtocol(protocol);
      });
    }

    // Setup frequency capability
    if (this.hasCapability('ir_frequency')) {
      this.registerCapabilityListener('ir_frequency', async (frequency) => {
        await this._setCarrierFrequency(frequency);
      });
    }
  }

  /**
   * v5.5.356: Initialize protocol detection from research
   */
  async _initializeProtocolDetection() {
    this._protocolAnalysis = {
      detectedProtocols: [],
      frequencyAnalysis: {},
      patternRecognition: {},
      confidenceScores: {}
    };

    this.log('Protocol detection initialized');
  }

  /**
   * v5.5.356: Setup advanced cluster listeners based on Zigbee2MQTT implementation
   */
  async _setupAdvancedClusterListeners(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return;

    // Listen for Tuya datapoints (alternative protocol)
    if (endpoint.clusters.tuya) {
      endpoint.clusters.tuya.on('datapoint', (data) => {
        this._handleTuyaIRDatapoint(data);
      });
    }

    // Listen for generic cluster frames that might contain IR data
    endpoint.on('frame', (clusterId, frame, meta) => {
      if (clusterId === ZOSUNG_IR_CONTROL_CLUSTER_ID ||
        clusterId === ZOSUNG_IR_TRANSMIT_CLUSTER_ID) {
        this._handleIRClusterFrame(clusterId, frame, meta);
      }
    });
  }

  /**
   * v5.5.356: Enable advanced IR learning mode with protocol detection
   */
  async _enableAdvancedLearnMode(duration = 30, options = {}) {
    const { protocol = 'auto', frequency = IR_FREQUENCIES.DEFAULT, codeName } = options;

    this.log(`Enabling advanced IR learn mode: protocol=${protocol}, frequency=${frequency}, duration=${duration}s`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      this._learningState = LEARNING_STATES.LEARNING;
      this._pendingLearnOptions = options;

      // v5.5.357: FORUM FIX - Persist button state ON
      if (this.hasCapability('button.learn_ir')) {
        await this.setCapabilityValue('button.learn_ir', true).catch(() => { });
      }

      // v5.5.356: Enhanced protocol setup
      const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
      if (irControlCluster) {
        try {
          // Set protocol if specified
          if (protocol !== 'auto' && IR_PROTOCOLS[protocol.toUpperCase()]) {
            await this._setIRProtocol(protocol);
          }

          // Set frequency if specified
          if (frequency && frequency !== IR_FREQUENCIES.DEFAULT) {
            await this._setCarrierFrequency(frequency);
          }

          // Start learning
          await irControlCluster.IRLearn({ onoff: true });
          this.log('Advanced IR learning started via ZosungIRControl');
        } catch (clusterErr) {
          this.log('ZosungIRControl failed, using fallback:', clusterErr.message);
          await zclNode.endpoints[1].clusters.onOff?.setOn();
        }
      } else {
        // v5.8.1: Try Tuya DP for learn mode if no Zosung cluster
        const tuyaCluster = zclNode.endpoints[1].clusters.tuya;
        if (tuyaCluster) {
          try {
            // DP1 = learn mode on some Tuya IR blasters
            await tuyaCluster.datapoint({ dp: 1, datatype: 1, data: Buffer.from([1]) });
            this.log('IR learn started via Tuya DP1');
          } catch (tuyaErr) {
            this.log('Tuya DP1 failed, trying OnOff:', tuyaErr.message);
            await zclNode.endpoints[1].clusters.onOff?.setOn();
            this.log('IR learn started via OnOff fallback');
          }
        } else {
          await zclNode.endpoints[1].clusters.onOff?.setOn();
          this.log('IR learn started via OnOff fallback');
        }
      }

      // Initialize advanced receive listener
      this._initializeEnhancedReceive();

      // Set timeout
      if (this._learnTimeout) {
        this.homey.clearTimeout(this._learnTimeout);
      }

      // v5.5.357: FORUM FIX - Extend timeout to 60s (was 30s)
      const extendedDuration = Math.max(duration, 60);
      this._learnTimeout = this.homey.setTimeout(async () => {
        try {
          await this._disableLearnMode();
          this._learningState = LEARNING_STATES.TIMEOUT;
          this._triggerLearningStateChanged(LEARNING_STATES.TIMEOUT);
          this.log(`Advanced learn mode timeout after ${extendedDuration}s`);
        } catch (e) {
          this.log('Learn timeout error:', e.message);
        }
      }, extendedDuration * 1000);

      // Trigger flow card
      this.driver.learningStartedTrigger?.trigger(this, {
        protocol: protocol,
        frequency: frequency,
        duration: duration
      }, {}).catch(() => { });

    } catch (err) {
      this._learningState = LEARNING_STATES.ERROR;
      this.error('Failed to enable advanced learn mode:', err);
      throw err;
    }
  }

  /**
   * v5.5.311: Enable IR learning mode using ZosungIRControl cluster (legacy)
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

      // v5.5.357: FORUM FIX - Reset button state OFF
      if (this.hasCapability('button.learn_ir')) {
        await this.setCapabilityValue('button.learn_ir', false).catch(() => { });
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
        if (this.hasCapability('ir_blaster_code_received')) {
          this.setCapabilityValue('ir_blaster_code_received', this._lastLearnedCode).catch(() => { });
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
   * v5.5.602: Enhanced IR code sending with multiple protocol support
   * Based on Zigbee2MQTT zosungIRTransmit + SmartIR MQTT format
   * @param {string} irCode - Base64 encoded IR code
   * @param {object} options - Send options (format, frequency)
   */
  async sendIRCode(irCode, options = {}) {
    this.log(`Sending IR code: ${irCode.substring(0, 30)}...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // v5.5.602: Support multiple message formats for compatibility
      // Format 1: Simple Z2M/SmartIR format (most compatible)
      const simpleMessage = JSON.stringify({
        'ir_blaster_code_to_send': irCode
      });
      
      // Format 2: Extended format with frequency/timing (for complex codes)
      const extendedMessage = JSON.stringify({
        'key_num': 1,
        'delay': 300,
        'key1': {
          'num': 1,
          'freq': options.frequency || 38000,
          'type': 1,
          'key_code': irCode
        }
      });
      
      // Use simple format by default, extended for large codes
      const irMessage = irCode.length > 500 ? extendedMessage : simpleMessage;

      // Try chunked transmission first (most reliable for large codes)
      const irTransmitCluster = zclNode.endpoints[1].clusters.zosungIRTransmit;
      if (irTransmitCluster && irCode.length > 100) {
        try {
          await this._sendChunkedIRCode(irMessage, irTransmitCluster);
          this.log('IR code sent via chunked ZosungIRTransmit protocol');
          return;
        } catch (chunkErr) {
          this.log('Chunked send failed, trying direct:', chunkErr.message);
        }
      }

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
   * v5.5.361: Send IR code using chunked transmission protocol
   * Based on Zigbee2MQTT zosung_ir_code_to_send implementation
   */
  async _sendChunkedIRCode(irMessage, transmitCluster) {
    // Generate sequence number
    this._irSeq = ((this._irSeq || 0) + 1) % 0x10000;
    const seq = this._irSeq;

    // Store message for chunked transmission
    this._pendingIRMessage = irMessage;
    this._pendingIRSeq = seq;

    this.log(`Starting chunked IR transmission: seq=${seq}, length=${irMessage.length}`);

    // Send start command (Code00)
    await transmitCluster.startTransmit({
      sequenceNumber: seq,
      totalLength: irMessage.length
    });

    // Wait for acknowledgment and data requests
    // The device will request chunks via codeDataRequest events
    return new Promise((resolve, reject) => {
      const timeout = this.homey.setTimeout(() => {
        delete this._pendingIRMessage;
        delete this._pendingIRSeq;
        reject(new Error('IR transmission timeout'));
      }, 10000);

      this._irTransmitResolve = () => {
        this.homey.clearTimeout(timeout);
        delete this._pendingIRMessage;
        delete this._pendingIRSeq;
        resolve();
      };

      this._irTransmitReject = (err) => {
        this.homey.clearTimeout(timeout);
        delete this._pendingIRMessage;
        delete this._pendingIRSeq;
        reject(err);
      };
    });
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
   * v5.5.356: Register enhanced flow card actions inspired by SDK patterns
   */
  registerFlowCardActions() {
    this.log('Registering enhanced IR flow card actions...');

    // Enhanced learn IR code action
    const learnAction = this.homey.flow.getActionCard('ir_blaster_learn_code');
    if (learnAction) {
      learnAction.registerRunListener(async (args) => {
        const { code_name, duration, protocol, frequency, category } = args;
        this.log(`Flow: Learning IR code "${code_name}" - protocol: ${protocol}, duration: ${duration}s`);

        try {
          await this._enableAdvancedLearnMode(duration || 30, {
            protocol: protocol || 'auto',
            frequency: frequency || IR_FREQUENCIES.DEFAULT,
            codeName: code_name,
            category: category || 'uncategorized'
          });

          return true;
        } catch (err) {
          this.error('Enhanced flow learn action failed:', err);
          return false;
        }
      });
    }

    // Enhanced send IR code action
    const sendAction = this.homey.flow.getActionCard('ir_blaster_send_code');
    if (sendAction) {
      sendAction.registerRunListener(async (args) => {
        const { ir_code, protocol, frequency, repeat } = args;
        this.log(`Flow: Sending IR code "${ir_code}" with enhanced options`);

        try {
          // Check if it's a named code or direct base64
          let codeToSend = ir_code;
          if (this._learnedCodes[ir_code]) {
            codeToSend = this._learnedCodes[ir_code];
            this.log(`Using stored code for "${ir_code}"`);
          }

          await this.sendEnhancedIRCode(codeToSend, {
            protocol: protocol,
            frequency: frequency,
            repeat: repeat || 1
          });
          return true;
        } catch (err) {
          this.error('Enhanced flow send action failed:', err);
          return false;
        }
      });
    }

    // v5.5.361: Re-enabled flow cards - properly implemented in driver.js
    this.log('IR Blaster flow cards ready (ir_send_by_category in driver.js)')
  }

  /**
   * Store learned IR code with name (enhanced version)
   */
  async storeLearnedCode(name, code) {
    // Use enhanced storage if we have pending options
    if (this._pendingLearnOptions) {
      await this.storeEnhancedLearnedCode(name, code, this._pendingLearnOptions);
      this._pendingLearnOptions = null;
    } else {
      // Legacy storage for backward compatibility
      this._learnedCodes[name] = code;
      this._codeNames = Object.keys(this._learnedCodes);

      try {
        await this.setStoreValue('learned_codes', this._learnedCodes);
        this.log(`Stored IR code "${name}": ${code.substring(0, 30)}...`);
      } catch (err) {
        this.error('Failed to store learned code:', err);
      }
    }
  }

  /**
   * Get stored IR codes
   */
  getStoredCodes() {
    return { ...this._learnedCodes };
  }

  /**
   * Delete stored IR code
   */
  async deleteStoredCode(name) {
    delete this._learnedCodes[name];
    this._codeNames = Object.keys(this._learnedCodes);

    try {
      await this.setStoreValue('learned_codes', this._learnedCodes);
      this.log(`Deleted IR code "${name}"`);
    } catch (err) {
      this.error('Failed to delete stored code:', err);
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

    // If we have a pending learn operation, store it with name
    if (this._pendingLearnName) {
      this.storeLearnedCode(this._pendingLearnName, code).catch(this.error);
      this._pendingLearnName = null;
    }
  }

  /**
   * v5.5.356: Advanced methods from SDK research and GitHub sources
   */

  // Handle learning status changes
  _handleLearningStatusChange(status) {
    this.log(`Learning status changed: ${status}`);
    this._learningState = status;
    this._triggerLearningStateChanged(status);

    if (status === LEARNING_STATES.SUCCESS) {
      this.readLastLearnedCode().catch(this.error);
    }
  }

  // Handle learned code from cluster
  _handleLearnedCode(code) {
    if (code && code.length > 0) {
      this.log(`Received learned IR code: ${code.substring(0, 50)}...`);
      this.setLastLearnedCode(code);

      // Analyze protocol
      this._analyzeIRProtocol(code);

      // Trigger success state
      this._learningState = LEARNING_STATES.SUCCESS;
      this._triggerLearningStateChanged(LEARNING_STATES.SUCCESS);
    }
  }

  // v5.5.361: Setup transmit protocol for enhanced cluster with chunked support
  _setupTransmitProtocol(cluster) {
    cluster.on('startTransmitAck', (data) => {
      this.log('Transmit ACK received:', data);
    });

    cluster.on('codeDataRequest', (data) => {
      this._handleCodeDataRequest(data);
    });

    cluster.on('doneSending', (data) => {
      this.log('IR transmission completed:', data);
      this._handleTransmitComplete(data);
    });

    // v5.5.362: FORUM FIX - Handle IR code reception during learning
    // When device receives IR signal, it sends doneReceiving with total length
    // We must then request chunks to get the full code
    cluster.on('doneReceiving', async (data) => {
      this.log('📥 IR code receive completed:', data);
      const { sequenceNumber, totalLength } = data;

      if (totalLength > 0) {
        // Start requesting chunks to get the learned IR code
        await this._requestLearnedCodeChunks(cluster, sequenceNumber, totalLength);
      } else {
        // Fallback: try reading attribute
        this.readLastLearnedCode().catch(this.error);
      }
    });

    // v5.5.362: Handle incoming code data (device sending learned code chunks)
    cluster.on('codeDataResponse', async (data) => {
      this.log('📥 IR code chunk received:', data);
      await this._handleReceivedCodeChunk(data);
    });

    // v5.5.362: Handle startTransmit from device (learning mode)
    cluster.on('startTransmit', async (data) => {
      this.log('📥 IR code transmission starting from device:', data);
      const { sequenceNumber, totalLength } = data;

      // Initialize receive buffer for this sequence
      this._receiveBuffers[sequenceNumber] = {
        totalLength,
        receivedLength: 0,
        chunks: [],
        startTime: Date.now()
      };

      // Send ACK to device
      try {
        await cluster.startTransmitAck({
          sequenceNumber,
          status: 0 // OK
        });
        this.log('✅ Sent startTransmitAck');
      } catch (err) {
        this.log('⚠️ Failed to send startTransmitAck:', err.message);
      }
    });
  }

  /**
   * v5.5.362: FORUM FIX - Request learned code chunks from device
   * Based on Zigbee2MQTT zosung protocol implementation
   */
  async _requestLearnedCodeChunks(cluster, sequenceNumber, totalLength) {
    this.log(`📥 Requesting ${totalLength} bytes of IR code data, seq=${sequenceNumber}`);

    // Initialize receive buffer
    this._receiveBuffers[sequenceNumber] = {
      totalLength,
      receivedLength: 0,
      chunks: [],
      startTime: Date.now()
    };

    const CHUNK_SIZE = 0x32; // 50 bytes per chunk (standard Zosung protocol)
    let position = 0;

    try {
      while (position < totalLength) {
        const remainingLength = totalLength - position;
        const requestLength = Math.min(CHUNK_SIZE, remainingLength);

        this.log(`📤 Requesting chunk: pos=${position}, len=${requestLength}`);

        await cluster.codeDataRequest({
          sequenceNumber,
          position,
          maxLength: requestLength
        });

        // Wait for response (handled by codeDataResponse listener)
        await new Promise(resolve => this.homey.setTimeout(resolve, 100));

        // Check if we received the chunk
        const buffer = this._receiveBuffers[sequenceNumber];
        if (buffer && buffer.receivedLength > position) {
          position = buffer.receivedLength;
        } else {
          // Timeout waiting for chunk, move to next position anyway
          position += requestLength;
        }

        // Safety timeout
        if (Date.now() - buffer.startTime > 10000) {
          this.log('⚠️ Timeout requesting IR code chunks');
          break;
        }
      }

      // Assemble final code
      await this._assembleReceivedCode(sequenceNumber);

    } catch (err) {
      this.error('Failed to request IR code chunks:', err);
    }
  }

  /**
   * v5.5.362: Handle received code chunk during learning
   */
  async _handleReceivedCodeChunk(data) {
    const { sequenceNumber, position, data: chunkData } = data;

    const buffer = this._receiveBuffers[sequenceNumber];
    if (!buffer) {
      this.log(`⚠️ Unexpected chunk for seq=${sequenceNumber}, no buffer`);
      return;
    }

    // Store chunk
    buffer.chunks.push({ position, data: chunkData });
    buffer.receivedLength = Math.max(buffer.receivedLength, position + chunkData.length);

    this.log(`📥 Chunk stored: pos=${position}, len=${chunkData.length}, total=${buffer.receivedLength}/${buffer.totalLength}`);

    // Check if complete
    if (buffer.receivedLength >= buffer.totalLength) {
      await this._assembleReceivedCode(sequenceNumber);
    }
  }

  /**
   * v5.5.362: Assemble received chunks into complete IR code
   */
  async _assembleReceivedCode(sequenceNumber) {
    const buffer = this._receiveBuffers[sequenceNumber];
    if (!buffer || buffer.chunks.length === 0) {
      this.log('⚠️ No chunks to assemble');
      return;
    }

    try {
      // Sort chunks by position
      buffer.chunks.sort((a, b) => a.position - b.position);

      // Concatenate all chunk data
      const totalBuffer = Buffer.alloc(buffer.totalLength);
      for (const chunk of buffer.chunks) {
        chunk.data.copy(totalBuffer, chunk.position);
      }

      // Convert to base64 string (standard IR code format)
      const irCode = totalBuffer.toString('base64');

      this.log(`✅ Assembled IR code: ${irCode.length} chars (${buffer.totalLength} bytes)`);
      this.log(`📝 IR Code preview: ${irCode.substring(0, 100)}...`);

      // Store and display the learned code
      this._handleLearnedCode(irCode);

      // Update capability immediately
      if (this.hasCapability('ir_blaster_code_received')) {
        await this.setCapabilityValue('ir_blaster_code_received', irCode).catch(() => { });
        this.log('✅ Updated ir_code_received capability');
      }

      // Cleanup
      delete this._receiveBuffers[sequenceNumber];

    } catch (err) {
      this.error('Failed to assemble IR code:', err);
    }
  }

  // Handle Tuya IR datapoint
  // v5.8.1: Enhanced Tuya DP handling for IR blasters without Zosung clusters
  _handleTuyaIRDatapoint(data) {
    this.log('[TUYA-IR] Datapoint received:', JSON.stringify({ dp: data.dp, type: data.datatype, len: data.data?.length }));

    // DP 201: IR code received (learning result)
    if (data.dp === 201 && data.datatype === 3) {
      const code = data.data.toString('base64');
      this.log('[TUYA-IR] ✅ Learned code via DP201:', code.substring(0, 50) + '...');
      this._handleLearnedCode(code);
    }
    // DP 202: Learning status (some devices)
    else if (data.dp === 202) {
      const status = data.data.readUInt8?.(0) ?? data.data[0];
      this.log(`[TUYA-IR] Learning status: ${status} (0=idle, 1=learning, 2=success, 3=timeout)`);
      if (status === 2 && this._learningState === 1) {
        this.log('[TUYA-IR] ✅ Learning successful, waiting for code...');
      }
    }
    // DP 1: Some IR blasters use DP1 for learn mode toggle
    else if (data.dp === 1) {
      const learnOn = data.data.readUInt8?.(0) ?? data.data[0];
      this.log(`[TUYA-IR] Learn mode: ${learnOn ? 'ON' : 'OFF'}`);
      this._learningState = learnOn ? 1 : 0;
    }
    // DP 2: IR code to send (echo back)
    else if (data.dp === 2 && data.datatype === 3) {
      this.log('[TUYA-IR] IR send echo received');
    }
  }

  // Handle IR cluster frames
  _handleIRClusterFrame(clusterId, frame, meta) {
    this.log(`IR cluster frame: ${clusterId.toString(16)}, cmd: ${frame.command}`);

    if (clusterId === ZOSUNG_IR_CONTROL_CLUSTER_ID) {
      // Handle control cluster responses
      if (frame.command === CMD_IR_LEARN && frame.data) {
        this._handleLearnedCode(frame.data.toString('base64'));
      }
    } else if (clusterId === ZOSUNG_IR_TRANSMIT_CLUSTER_ID) {
      // Handle transmit cluster protocol
      this._handleTransmitFrame(frame);
    }
  }

  // Trigger learning state changed flow
  _triggerLearningStateChanged(state) {
    const stateNames = Object.keys(LEARNING_STATES);
    const stateName = stateNames.find(key => LEARNING_STATES[key] === state) || 'unknown';

    this.driver.learningStateChangedTrigger?.trigger(this, {
      state: stateName.toLowerCase(),
      state_code: state
    }, {}).catch(() => { });
  }

  // Initialize enhanced receive handling
  _initializeEnhancedReceive() {
    this._receiveBuffers = {};
    this._pendingReceiveSeqs = [];
    this._lastReceiveTime = Date.now();
  }

  // Set IR protocol
  async _setIRProtocol(protocol) {
    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) return;

    const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
    if (irControlCluster && IR_PROTOCOLS[protocol.toUpperCase()]) {
      try {
        await irControlCluster.IRProtocolSet({
          protocol: IR_PROTOCOLS[protocol.toUpperCase()],
          frequency: IR_FREQUENCIES.DEFAULT
        });
        this.log(`IR protocol set to: ${protocol}`);
      } catch (err) {
        this.error('Failed to set IR protocol:', err);
      }
    }
  }

  // Set carrier frequency
  async _setCarrierFrequency(frequency) {
    if (frequency < IR_FREQUENCIES.MIN || frequency > IR_FREQUENCIES.MAX) {
      throw new Error(`Invalid frequency: ${frequency}. Must be between ${IR_FREQUENCIES.MIN} and ${IR_FREQUENCIES.MAX}`);
    }

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) return;

    const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
    if (irControlCluster) {
      try {
        await irControlCluster.IRProtocolSet({
          protocol: IR_PROTOCOLS.UNKNOWN,
          frequency: frequency
        });
        this.log(`Carrier frequency set to: ${frequency}Hz`);
      } catch (err) {
        this.error('Failed to set carrier frequency:', err);
      }
    }
  }

  // Analyze IR protocol from code
  _analyzeIRProtocol(code) {
    try {
      // Basic protocol analysis
      const buffer = Buffer.from(code, 'base64');
      const analysis = {
        length: buffer.length,
        frequency: this._detectFrequency(buffer),
        protocol: this._detectProtocol(buffer),
        confidence: 0
      };

      this._protocolAnalysis[code] = analysis;
      this.log('IR protocol analysis:', analysis);

      return analysis;
    } catch (err) {
      this.log('Protocol analysis failed:', err.message);
      return null;
    }
  }

  // Detect IR frequency from buffer
  _detectFrequency(buffer) {
    // Simple frequency detection heuristic
    if (buffer.length < 10) return IR_FREQUENCIES.DEFAULT;

    const patterns = [];
    for (let i = 0; i < Math.min(buffer.length, 50); i += 2) {
      const pulse = buffer.readUInt16BE(i);
      patterns.push(pulse);
    }

    // Find most common frequency indicators
    const avgPulse = patterns.reduce((a, b) => a + b, 0) / patterns.length;

    if (avgPulse > 400 && avgPulse < 600) return 38000;
    if (avgPulse > 350 && avgPulse < 450) return 40000;
    if (avgPulse > 300 && avgPulse < 400) return 36000;

    return IR_FREQUENCIES.DEFAULT;
  }

  // Detect IR protocol from buffer
  _detectProtocol(buffer) {
    if (buffer.length < 20) return 'UNKNOWN';

    // Simple protocol detection patterns
    const header = buffer.slice(0, 8);

    // NEC protocol detection (common patterns)
    if (this._matchesPattern(header, [0x00, 0x00, 0x73, 0x00])) {
      return 'PRONTOHEX';
    }

    // Look for repeating patterns (common in NEC, RC5)
    const patterns = this._findRepeatingPatterns(buffer);
    if (patterns.length > 0) {
      if (patterns[0].length === 32) return 'NEC';
      if (patterns[0].length === 14) return 'RC5';
      if (patterns[0].length === 20) return 'RC6';
    }

    return 'UNKNOWN';
  }

  // Helper: match buffer pattern
  _matchesPattern(buffer, pattern) {
    if (buffer.length < pattern.length) return false;

    for (let i = 0; i < pattern.length; i++) {
      if (buffer[i] !== pattern[i]) return false;
    }
    return true;
  }

  // Helper: find repeating patterns
  _findRepeatingPatterns(buffer) {
    const patterns = [];
    const maxPatternLength = Math.min(buffer.length / 2, 64);

    for (let len = 8; len <= maxPatternLength; len += 2) {
      const pattern = buffer.slice(0, len);
      const nextPattern = buffer.slice(len, len * 2);

      if (pattern.equals(nextPattern)) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  // Handle transmit frame for enhanced protocol
  _handleTransmitFrame(frame) {
    switch (frame.command) {
      case CMD_START_TRANSMIT:
        this.log('Transmit started:', frame.data);
        break;
      case CMD_CODE_DATA_REQUEST:
        this.log('Code data requested:', frame.data);
        break;
      case CMD_DONE_SENDING:
        this.log('Transmit completed');
        break;
    }
  }

  // v5.5.361: Handle code data request for chunked transmission
  async _handleCodeDataRequest(data) {
    if (!this._pendingIRMessage) return;

    const { sequenceNumber, position, maxLength } = data;

    // Verify sequence
    if (sequenceNumber !== this._pendingIRSeq) {
      this.error(`Unexpected sequence: expected ${this._pendingIRSeq}, got ${sequenceNumber}`);
      return;
    }

    // Extract chunk from message
    const chunk = this._pendingIRMessage.substring(position, position + (maxLength || 0x32));
    const chunkBuffer = Buffer.from(chunk);

    // Calculate CRC
    const crc = Array.from(chunkBuffer.values()).reduce((a, b) => a + b, 0) % 0x100;

    this.log(`Sending IR chunk: pos=${position}, len=${chunk.length}, crc=${crc}`);

    if (this._irTransmitCluster) {
      try {
        await this._irTransmitCluster.codeDataResponse({
          sequenceNumber,
          position,
          data: chunkBuffer
        });
      } catch (err) {
        this.error('Failed to send code data response:', err);
        this._irTransmitReject?.(err);
      }
    }
  }

  // v5.5.361: Handle transmission complete
  _handleTransmitComplete(data) {
    const { sequenceNumber } = data;
    if (sequenceNumber === this._pendingIRSeq) {
      this.log('IR transmission completed successfully');
      this._irTransmitResolve?.();
    }
  }

  /**
   * v5.5.356: Enhanced IR code management from SDK patterns
   */

  // Store learned code with enhanced metadata
  async storeEnhancedLearnedCode(name, code, metadata = {}) {
    const analysis = this._analyzeIRProtocol(code);

    this._learnedCodes[name] = code;
    this._codeMetadata[name] = {
      ...metadata,
      learnedAt: new Date().toISOString(),
      protocol: analysis?.protocol || 'UNKNOWN',
      frequency: analysis?.frequency || IR_FREQUENCIES.DEFAULT,
      length: code.length,
      category: metadata.category || 'uncategorized'
    };

    this._codeNames = Object.keys(this._learnedCodes);

    try {
      await this.setStoreValue('learned_codes', this._learnedCodes);
      await this.setStoreValue('code_metadata', this._codeMetadata);
      this.log(`Enhanced stored IR code "${name}":`, this._codeMetadata[name]);
    } catch (err) {
      this.error('Failed to store enhanced learned code:', err);
    }
  }

  // Get code by category
  getCodesByCategory(category) {
    const codes = {};
    for (const [name, metadata] of Object.entries(this._codeMetadata)) {
      if (metadata.category === category) {
        codes[name] = this._learnedCodes[name];
      }
    }
    return codes;
  }

  // Get available categories
  getAvailableCategories() {
    const categories = new Set();
    for (const metadata of Object.values(this._codeMetadata)) {
      categories.add(metadata.category || 'uncategorized');
    }
    return Array.from(categories);
  }

  // Enhanced send with protocol detection
  async sendEnhancedIRCode(code, options = {}) {
    const { protocol, frequency, repeat = 1 } = options;

    this.log(`Sending enhanced IR code with options:`, { protocol, frequency, repeat });

    // Analyze code if not already done
    if (!this._protocolAnalysis[code]) {
      this._analyzeIRProtocol(code);
    }

    const analysis = this._protocolAnalysis[code];
    if (analysis && protocol && analysis.protocol !== protocol) {
      this.log(`Warning: Detected protocol ${analysis.protocol} differs from requested ${protocol}`);
    }

    // Set protocol/frequency if specified
    if (protocol || frequency) {
      await this._setIRProtocol(protocol || analysis?.protocol || 'UNKNOWN');
      if (frequency) {
        await this._setCarrierFrequency(frequency);
      }
    }

    // Send code with repeats
    for (let i = 0; i < repeat; i++) {
      await this.sendIRCode(code);
      if (i < repeat - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between repeats
      }
    }
  }

  /**
   * v5.5.606: SmartIR/Z2M format support
   */
  async importSmartIRCodes(jsonData, category = 'imported') {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    let count = 0;
    if (data.commands) {
      for (const [name, code] of Object.entries(data.commands)) {
        const irCode = typeof code === 'string' && code.includes('ir_blaster_code_to_send') 
          ? JSON.parse(code).ir_code_to_send : code;
        if (irCode) {
          await this.storeEnhancedLearnedCode(`${category}_${name}`, irCode, { category });
          count++;
        }
      }
    }
    this.log(`Imported ${count} SmartIR codes`);
    return { success: true, count };
  }

  exportSmartIRFormat() {
    const result = { commands: {} };
    for (const [name, code] of Object.entries(this._learnedCodes)) {
      result.commands[name] = JSON.stringify({ ir_code_to_send: code });
    }
    return result;
  }

  async sendACCommand(mode, temp, fan = 'auto') {
    const patterns = [`ac_${mode}_${fan}_${temp}`, `${mode}_${fan}_${temp}`];
    for (const p of patterns) {
      if (this._learnedCodes[p]) {
        await this.sendIRCode(this._learnedCodes[p]);
        return true;
      }
    }
    return false;
  }

  onDeleted() {
    this.log('IR Blaster device deleted');

    // Cleanup timeouts
    if (this._learnTimeout) {
      this.homey.clearTimeout(this._learnTimeout);
    }

    // Cleanup any pending transmissions
    this._currentTransmitCode = null;
    this._receiveBuffers = {};
  }
}

module.exports = IrBlasterDevice;

