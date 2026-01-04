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
 * v5.5.356: Enhanced ZosungIRControl cluster (0xE004)
 * Based on Zigbee2MQTT/ZHA + research from SDK documentation
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
      },
      // v5.5.356: Additional commands from research
      IRCodeQuery: {
        id: 0x03,
        args: {
          codeId: ZCLDataTypes.uint8
        }
      },
      IRProtocolSet: {
        id: 0x04,
        args: {
          protocol: ZCLDataTypes.enum8,  // 0=NEC, 1=RC5, 2=Sony, etc.
          frequency: ZCLDataTypes.uint32
        }
      }
    };
  }

  static get ATTRIBUTES() {
    return {
      lastLearnedIRCode: {
        id: 0x0000,
        type: ZCLDataTypes.string
      },
      // v5.5.356: Enhanced attributes from SDK research
      learningStatus: {
        id: 0x0001,
        type: ZCLDataTypes.enum8  // 0=idle, 1=learning, 2=success, 3=timeout
      },
      supportedProtocols: {
        id: 0x0002,
        type: ZCLDataTypes.bitmap8  // Bit mask of supported IR protocols
      },
      carrierFrequency: {
        id: 0x0003,
        type: ZCLDataTypes.uint32   // Current carrier frequency (Hz)
      },
      maxCodeLength: {
        id: 0x0004,
        type: ZCLDataTypes.uint16   // Maximum IR code length
      }
    };
  }
}

/**
 * v5.5.356: Enhanced ZosungIRTransmit cluster (0xED00)
 * Advanced protocol implementation from GitHub sources
 */
class ZosungIRTransmitCluster extends Cluster {
  static get ID() { return ZOSUNG_IR_TRANSMIT_CLUSTER_ID; }
  static get NAME() { return 'zosungIRTransmit'; }

  static get COMMANDS() {
    return {
      startTransmit: {
        id: CMD_START_TRANSMIT,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          totalLength: ZCLDataTypes.uint16
        }
      },
      startTransmitAck: {
        id: CMD_START_TRANSMIT_ACK,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          status: ZCLDataTypes.uint8
        }
      },
      codeDataRequest: {
        id: CMD_CODE_DATA_REQUEST,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          position: ZCLDataTypes.uint16,
          maxLength: ZCLDataTypes.uint8
        }
      },
      codeDataResponse: {
        id: CMD_CODE_DATA_RESPONSE,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          position: ZCLDataTypes.uint16,
          data: ZCLDataTypes.buffer
        }
      },
      doneSending: {
        id: CMD_DONE_SENDING,
        args: {
          sequenceNumber: ZCLDataTypes.uint8
        }
      },
      doneReceiving: {
        id: CMD_DONE_RECEIVING,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          totalLength: ZCLDataTypes.uint16
        }
      }
    };
  }
}

// Register the custom clusters
Cluster.addCluster(ZosungIRControlCluster);
Cluster.addCluster(ZosungIRTransmitCluster);

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

    // Setup OnOff cluster for learn mode (fallback)
    if (zclNode.endpoints[1]?.clusters?.onOff) {
      this.log('Setting up OnOff cluster for learn mode...');

      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
        this.log(`Learn mode: ${value ? 'ON' : 'OFF'}`);
        this._learningState = value ? LEARNING_STATES.LEARNING : LEARNING_STATES.IDLE;
        this.setCapabilityValue('onoff', value).catch(this.error);

        // v5.5.356: Trigger learning state changed flow
        this._triggerLearningStateChanged(this._learningState);
      });

      // Register capability listener
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
    if (!endpoint) return;

    this.log('Setting up advanced IR clusters...');

    try {
      // Setup ZosungIRControl cluster (0xE004)
      const irControlCluster = endpoint.clusters.zosungIRControl;
      if (irControlCluster) {
        this.log('ZosungIRControl cluster available - setting up listeners');

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
      }

      // Setup ZosungIRTransmit cluster (0xED00)
      const irTransmitCluster = endpoint.clusters.zosungIRTransmit;
      if (irTransmitCluster) {
        this.log('ZosungIRTransmit cluster available - setting up advanced protocol');
        this._irTransmitCluster = irTransmitCluster;

        // Setup transmit protocol listeners
        this._setupTransmitProtocol(irTransmitCluster);
      }

    } catch (err) {
      this.log('Advanced IR cluster setup error:', err.message);
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
      // Set learning state
      this._learningState = LEARNING_STATES.LEARNING;
      this._pendingLearnOptions = options;
      this._pendingLearnName = codeName;

      // v5.5.356: Try enhanced IR control first
      const irControlCluster = zclNode.endpoints[1].clusters.zosungIRControl;
      if (irControlCluster) {
        try {
          // Set protocol if specified
          if (protocol !== 'auto' && IR_PROTOCOLS[protocol.toUpperCase()]) {
            await irControlCluster.IRProtocolSet({
              protocol: IR_PROTOCOLS[protocol.toUpperCase()],
              frequency: frequency
            });
            this.log(`IR protocol set to: ${protocol} @ ${frequency}Hz`);
          }

          // Start learning
          await irControlCluster.IRLearn({ onoff: true });
          this.log('Advanced IR learning started via ZosungIRControl');
        } catch (clusterErr) {
          this.log('ZosungIRControl failed, using fallback:', clusterErr.message);
          await this._enableLearnMode(duration);
          return;
        }
      } else {
        // Fallback to basic learning
        await this._enableLearnMode(duration);
        return;
      }

      this.setCapabilityValue('onoff', true).catch(() => { });
      this._triggerLearningStateChanged(LEARNING_STATES.LEARNING);

      // Initialize enhanced receive handling
      this._initializeEnhancedReceive();

      // Set timeout
      if (this._learnTimeout) {
        this.homey.clearTimeout(this._learnTimeout);
      }

      this._learnTimeout = this.homey.setTimeout(async () => {
        try {
          await this._disableLearnMode();
          this._learningState = LEARNING_STATES.TIMEOUT;
          this._triggerLearningStateChanged(LEARNING_STATES.TIMEOUT);
          this.log(`Advanced learn mode timeout after ${duration}s`);
        } catch (e) {
          this.log('Learn timeout error:', e.message);
        }
      }, duration * 1000);

      // Trigger enhanced flow card
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
   * v5.5.356: Register enhanced flow card actions inspired by SDK patterns
   */
  registerFlowCardActions() {
    this.log('Registering enhanced IR flow card actions...');

    // Enhanced learn IR code action
    const learnAction = this.homey.flow.getActionCard('ir_learn_code');
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
          throw new Error(`Failed to start learning: ${err.message}`);
        }
      });
    }

    // Enhanced send IR code action
    const sendAction = this.homey.flow.getActionCard('ir_send_code');
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
          throw new Error(`Failed to send IR code: ${err.message}`);
        }
      });
    }

    // Send by category action
    const sendCategoryAction = this.homey.flow.getActionCard('ir_send_by_category');
    if (sendCategoryAction) {
      sendCategoryAction.registerRunListener(async (args) => {
        const { category, code_name } = args;
        this.log(`Flow: Sending IR code "${code_name}" from category "${category}"`);

        try {
          const codes = this.getCodesByCategory(category);
          if (!codes[code_name]) {
            throw new Error(`Code "${code_name}" not found in category "${category}"`);
          }

          await this.sendIRCode(codes[code_name]);
          return true;
        } catch (err) {
          this.error('Category send action failed:', err);
          throw new Error(`Failed to send code: ${err.message}`);
        }
      });
    }

    // Set protocol action
    const protocolAction = this.homey.flow.getActionCard('ir_set_protocol');
    if (protocolAction) {
      protocolAction.registerRunListener(async (args) => {
        const { protocol, frequency } = args;
        this.log(`Flow: Setting IR protocol to "${protocol}" @ ${frequency}Hz`);

        try {
          await this._setIRProtocol(protocol);
          if (frequency) {
            await this._setCarrierFrequency(frequency);
          }
          return true;
        } catch (err) {
          this.error('Protocol set action failed:', err);
          throw new Error(`Failed to set protocol: ${err.message}`);
        }
      });
    }

    // Analyze code action
    const analyzeAction = this.homey.flow.getActionCard('ir_analyze_code');
    if (analyzeAction) {
      analyzeAction.registerRunListener(async (args) => {
        const { ir_code } = args;
        this.log(`Flow: Analyzing IR code "${ir_code}"`);

        try {
          let codeToAnalyze = ir_code;
          if (this._learnedCodes[ir_code]) {
            codeToAnalyze = this._learnedCodes[ir_code];
          }

          const analysis = this._analyzeIRProtocol(codeToAnalyze);
          if (analysis) {
            // Trigger analysis result flow
            this.driver.codeAnalyzedTrigger?.trigger(this, {
              code_name: ir_code,
              protocol: analysis.protocol,
              frequency: analysis.frequency,
              length: analysis.length
            }, {}).catch(() => { });
          }
          return true;
        } catch (err) {
          this.error('Analyze action failed:', err);
          throw new Error(`Failed to analyze code: ${err.message}`);
        }
      });
    }
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

  // Setup transmit protocol for enhanced cluster
  _setupTransmitProtocol(cluster) {
    cluster.on('startTransmitAck', (data) => {
      this.log('Transmit ACK received:', data);
    });

    cluster.on('codeDataRequest', (data) => {
      this._handleCodeDataRequest(data);
    });

    cluster.on('doneSending', (data) => {
      this.log('IR transmission completed:', data);
    });
  }

  // Handle Tuya IR datapoint
  _handleTuyaIRDatapoint(data) {
    this.log('Tuya IR datapoint:', data);

    if (data.dp === 201 && data.datatype === 3) {
      // IR code received via Tuya DP
      const code = data.data.toString('base64');
      this._handleLearnedCode(code);
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

  // Handle code data request
  async _handleCodeDataRequest(data) {
    if (!this._currentTransmitCode) return;

    const { sequenceNumber, position, maxLength } = data;
    const codeBuffer = Buffer.from(this._currentTransmitCode, 'base64');
    const chunk = codeBuffer.slice(position, position + maxLength);

    if (this._irTransmitCluster) {
      try {
        await this._irTransmitCluster.codeDataResponse({
          sequenceNumber,
          position,
          data: chunk
        });
      } catch (err) {
        this.error('Failed to send code data response:', err);
      }
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
