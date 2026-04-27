'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

// v5.8.52: Import Zosung clusters (registered at app startup in registerClusters.js)
const ZosungIRControlCluster = require('../../lib/clusters/ZosungIRControlCluster');
const ZosungIRTransmitCluster = require('../../lib/clusters/ZosungIRTransmitCluster');
// v5.9.14: BoundClusters to receive device-to-coordinator commands
const ZosungIRTransmitBoundCluster = require('../../lib/clusters/ZosungIRTransmitBoundCluster');
const ZosungIRControlBoundCluster = require('../../lib/clusters/ZosungIRControlBoundCluster');
const irBlasterInit = require('./irBlasterInit');

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
 * Protocol based on (Zigbee2MQTT / zigbee)-herdsman implementation.
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

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.13.3: IR blasters are USB-powered, remove battery capthis.log('IR Blaster initializing...');

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
    await irBlasterInit.init(this);

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
      this.log('[IR-INIT]  onoff capability listener registered');
    }

    // Setup OnOff cluster for learn mode attribute reports (if available)
    if (zclNode.endpoints[1]?.clusters?.onOff) {
      this.log('Setting up OnOff cluster for learn mode...' );

      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
        // v5.11.16: FIX (FrankP #1443) - Guard against device sending onOff=false
        // immediately after IRLearn command, which kills learn mode prematurely
        if (!value && this._learnModeActive) {
          const elapsed = Date.now() - (this._learnModeStartTime || 0);
          if (elapsed < 5000) {
            this.log(`[IR]  Ignoring onOff=false during learn mode (${elapsed}ms after start)`);
            return;
          }
        }
        this.log(`Learn mode attr: ${value ? 'ON' : 'OFF'}`);
        this._learningState = value ? LEARNING_STATES.LEARNING : LEARNING_STATES.IDLE;
        this.setCapabilityValue('onoff', value).catch(this.error);
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
      this.log('[IR-SETUP]  Endpoint 1 not available');
      return;
    }

    this.log('[IR-SETUP] Setting up advanced IR clusters...');
    this.log('[IR-SETUP] Available clusters:', Object.keys(endpoint.clusters || {}));

    try {
      // Setup ZosungIRControl cluster (0xE004)
      let irControlCluster = endpoint.clusters.zosungIRControl;
      if (!irControlCluster) {
        // v5.11.17: Device paired before cluster registration  manually instantiate
        this.log('[IR-SETUP]  ZosungIRControl not in simple descriptor  creating manual instance');
        try {
          irControlCluster = new ZosungIRControlCluster({ clusterEndpoint: endpoint });
          this.log('[IR-SETUP]  Manual ZosungIRControl instance created');
        } catch (e) {
          this.log('[IR-SETUP]  Manual ZosungIRControl failed:', e.message);
        }
      }
      this._irControlCluster = irControlCluster || null;
      if (irControlCluster) {
        this.log('[IR-SETUP]  ZosungIRControl cluster (0xE004) available');

        // Listen for learning status changes
        irControlCluster.on('attr.learningStatus', (status) => {
          this._handleLearningStatusChange(status);
      });

        // v7.2.5: Explicitly bind cluster to coordinator to receive learned codes
        await irControlCluster.bind().catch(e => this.log(`[IR-SETUP] Bind E004 warning: ${e.message}`));

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
        this.log('[IR-SETUP]  ZosungIRControl cluster NOT available - will use OnOff fallback');
      }

      // Setup ZosungIRTransmit cluster (0xED00)
      let irTransmitCluster = endpoint.clusters.zosungIRTransmit;
      if (!irTransmitCluster) {
        // v5.11.17: Manual instantiation fallback
        this.log('[IR-SETUP]  ZosungIRTransmit not in simple descriptor  creating manual instance');
        try {
          irTransmitCluster = new ZosungIRTransmitCluster({ clusterEndpoint: endpoint });
          this.log('[IR-SETUP]  Manual ZosungIRTransmit instance created');
        } catch (e) {
          this.log('[IR-SETUP]  Manual ZosungIRTransmit failed:', e.message);
        }
      }
      if (irTransmitCluster) {
        this.log('[IR-SETUP]  ZosungIRTransmit cluster (0xED00) available');
        this._irTransmitCluster = irTransmitCluster;

        // v7.2.5: Explicitly bind cluster to coordinator
        await irTransmitCluster.bind().catch(e => this.log(`[IR-SETUP] Bind ED00 warning: ${e.message}`));

        // Setup transmit protocol listeners
        this._setupTransmitProtocol(irTransmitCluster);
      } else {
        this.log('[IR-SETUP]  ZosungIRTransmit cluster NOT available');
      }

      // v5.9.14: Bind BoundClusters for incoming device commands
      try {
        endpoint.bind(ZosungIRTransmitCluster.NAME, new ZosungIRTransmitBoundCluster({ device: this }));
        this.log('[IR-SETUP]  IRTransmit BoundCluster bound');
      } catch (e) { this.log('[IR-SETUP] IRTransmit bind err:', e.message); }
      try {
        endpoint.bind(ZosungIRControlCluster.NAME, new ZosungIRControlBoundCluster({ device: this }));
        this.log('[IR-SETUP]  IRControl BoundCluster bound');
      } catch (e) { this.log('[IR-SETUP] IRControl bind err:', e.message); }

    } catch (err) {
      this.log('[IR-SETUP]  Advanced IR cluster setup error:', err.message);
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
      this._learnModeActive = true;
      this._learnModeStartTime = Date.now();
      this._pendingLearnOptions = options;

      // v5.5.357: FORUM FIX - Persist button state ON
      if (this.hasCapability('button.learn_ir')) {
        await this.setCapabilityValue('button.learn_ir', true).catch(() => { });
      }

      // v5.11.17: Use stored cluster instances (includes manual fallback from _setupAdvancedIRClusters)
      this.log(`[IR-LEARN] EP1 clusters: ${Object.keys(zclNode.endpoints[1].clusters || {}).join(', ')}`);
      const irControlCluster = this._irControlCluster;
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

          // v5.9.14: Z2M sends {"study":0} to start learning
          await irControlCluster.IRLearn({ data: Buffer.from(JSON.stringify({ study: 0 })) });
          this.log('Advanced IR learning started via ZosungIRControl (Z2M protocol)');
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
            this.log('IR learn started via OnOff fallback' );
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
        this.homey.clearTimeout(this._learnTimeout );
      }

      // v5.5.357: FORUM FIX - Extend timeout to 60s (was 30s)
      const extendedDuration = Math.max(duration * 60);
      this._learnTimeout = this.homey.setTimeout(async () => {
        try {
          await this._disableLearnMode();
          this._learningState = LEARNING_STATES.TIMEOUT;
          this._triggerLearningStateChanged(LEARNING_STATES.TIMEOUT);
          this.log(`Advanced learn mode timeout after ${extendedDuration}s`);
        } catch (e) {
          this.log('Learn timeout error:', e.message);
        }
      },extendedDuration * 1000);

      // Trigger flow card
      this.driver.learningStartedTrigger?.trigger(this, {
        protocol: protocol,
        frequency: frequency,
        duration: duration
      }, {}).catch(() => {};

    } catch (err) {
      this._learningState = LEARNING_STATES.ERROR;
      this._learnModeActive = false;
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
      this.log('Sending IR learn command to cluster 0xE004...' );

      // v5.11.17: Use stored cluster instance (includes manual fallback)
      const irControlCluster = this._irControlCluster;
      if (irControlCluster) {
        try {
          await irControlCluster.IRLearn({ data: Buffer.from(JSON.stringify({ study: 0 })) });
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
      },duration * 1000);

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
      // v5.11.16: Clear learn mode guard
      this._learnModeActive = false;

      // Clear timeout
      if (this._learnTimeout) {
        this.homey.clearTimeout(this._learnTimeout);
        this._learnTimeout = null;
      }

      // v5.5.357: FORUM FIX - Reset button state OFF
      if (this.hasCapability('button.learn_ir')) {
        await this.setCapabilityValue('button.learn_ir', false).catch(() => { });
      }

      // v5.11.17: Use stored cluster instance (includes manual fallback)
      const irControlCluster = this._irControlCluster;
      if (irControlCluster) {
        try {
          // v5.9.14: Z2M sends {"study":1} to stop learning
          await irControlCluster.IRLearn({ data: Buffer.from(JSON.stringify({ study: 1 })) });
          this.log('IR stop learn command sent via ZosungIRControl cluster');
        } catch (clusterErr) {
          this.log('ZosungIRControl.IRLearn stop failed:', clusterErr.message);
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
      throw new Error('Device not ready' );
    }

    try {
      // v5.9.14: Always use Z2M-compatible key_num JSON format
      const irMessage = JSON.stringify({
        'key_num': 1,
        'delay': 300,
        'key1': {
          'num': 1,
          'freq': options.frequency || 38000,
          'type': 1,
          'key_code': irCode
        }
      });

      // v5.11.17: Use stored cluster instances
      const irTransmitCluster = this._irTransmitCluster;
      if (irTransmitCluster && irCode.length > 100) {
        try {
          await this._sendChunkedIRCode(irMessage, irTransmitCluster);
          this.log('IR code sent via chunked ZosungIRTransmit protocol');
          return;
        } catch (chunkErr) {
          this.log('Chunked send failed, trying direct:', chunkErr.message);
        }
      }

      // v5.11.17: Use stored cluster instance
      const irControlCluster = this._irControlCluster;
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

    // v5.9.14: Send Z2M-compatible zosungSendIRCode00
    await transmitCluster.startTransmit({
      seq: seq,
      length: irMessage.length,
      unk1: 0x00000000,
      unk2: 0xE004,
      unk3: 0x01,
      cmd: 0x02,
      unk4: 0x0000
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
      const irControlCluster = this._irControlCluster;
      if (irControlCluster) {
        const result = await irControlCluster.readAttributes(['lastLearnedIRCode'] );
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
    // v5.12: Flow cards are registered in driver.js to avoid double-registration
    // device.js only logs readiness  all registerRunListener calls are in driver.js
    this.log('IR Blaster flow cards ready (all registered in driver.js)');
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
    delete this._codeMetadata[name];
    this._codeNames = Object.keys(this._learnedCodes);

    // Clean up category references
    if (this._codeCategories) {
      for (const cat of Object.keys(this._codeCategories)) {
        if (this._codeCategories[cat]) {
          delete this._codeCategories[cat][name];
          if (Object.keys(this._codeCategories[cat]).length === 0) {
            delete this._codeCategories[cat];
          }
        }
      }
    }

    try {
      await this.setStoreValue('learned_codes', this._learnedCodes);
      await this.setStoreValue('code_metadata', this._codeMetadata);
      await this.setStoreValue('code_categories', this._codeCategories);
      this.log(`Deleted IR code "${name}" + metadata`);
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
      const ackSeq = data.seq ?? data.sequenceNumber;
      if (this._pendingIRSeq !== undefined && ackSeq !== undefined && ackSeq !== this._pendingIRSeq) {
        this.log(`[IR-TX] Syncing seq from ACK: ${this._pendingIRSeq} -> ${ackSeq}`);
        this._pendingIRSeq = ackSeq;
      }
    });

    cluster.on('codeDataRequest', (data) => {
      this._handleCodeDataRequest(data);
      });

    cluster.on('doneSending', (data) => {
      this.log('IR transmission completed:', data);
      this._handleTransmitComplete(data);
      });

    // v5.12.0: Z2M Code05  device confirms it's done sending learned code
    // At this point all chunks are in _receiveBuffers  assemble as base64 + stop learning
    cluster.on('doneReceiving', async (data) => {
      this.log('[IR-RX] Code05 doneReceiving:', JSON.stringify(data));
      const seq = data.seq ?? data.sequenceNumber;
      await this._assembleAndFinishLearning(seq);
      });

    // v5.5.362: Handle incoming code data (device sending learned code chunks)
    cluster.on('codeDataResponse', async (data) => {
      this.log(' IR code chunk received:', data);
      await this._handleReceivedCodeChunk(data);
      });

    // v5.9.14: Handle startTransmit from device (learning mode)  Z2M Code00
    cluster.on('startTransmit', async (data) => {
      this.log(' IR code transmission starting from device:', data);
      const seq = data.seq ?? data.sequenceNumber;
      const totalLength = data.length ?? data.totalLength ?? 0;

      // v5.12.0: Z2M-compatible pre-allocated buffer for chunk assembly
      this._receiveBuffers[seq] = {
        totalLength,
        receivedLength: 0,
        position: 0,
        buf: Buffer.alloc(totalLength),
        chunks: [],
        startTime: Date.now()
      };

      // v5.9.14: Send Z2M-compatible Code01 ACK
      try {
        await cluster.startTransmitAck({
          zero: 0,
          seq: seq,
          length: totalLength,
          unk1: data.unk1 ?? 0x00000000,
          unk2: data.unk2 ?? 0xE004,
          unk3: data.unk3 ?? 0x01,
          cmd: data.cmd ?? 0x02,
          unk4: data.unk4 ?? 0x0000
        });
        this.log(' Sent Z2M startTransmitAck (Code01)');
      } catch (err) {
        this.log(' Failed to send startTransmitAck:', err.message);
      }

      // v5.9.14: After ACK, request first chunk (Code02)
      try {
        await cluster.codeDataRequest({
          seq: seq,
          position: 0,
          maxlen: 0x38
        });
        this.log(' Sent first codeDataRequest (Code02)');
      } catch (err) {
        this.log(' Failed to send codeDataRequest:', err.message);
      }
    });

    // v5.9.14: Wire BoundCluster device events to handlers
    this.on('ir.startTransmit', (d) => cluster.emit('startTransmit', d));
    this.on('ir.startTransmitAck', (d) => cluster.emit('startTransmitAck', d));
    this.on('ir.codeDataRequest', (d) => this._handleCodeDataRequest(d));
    this.on('ir.codeDataResponse', (d) => this._handleReceivedCodeChunk(d));
    this.on('ir.doneSending', (d) => this._handleTransmitComplete(d));
    this.on('ir.doneReceiving', (d) => cluster.emit('doneReceiving', d));
  }

  // v5.12.0: _requestLearnedCodeChunks removed  learning is now fully event-driven
  // Code00 handler sends ACK (Code01) + first Code02 request
  // Code03 handler stores chunks + requests next or sends Code04
  // Code05 handler assembles + stops learning

  /**
   * v5.5.362: Handle received code chunk during learning
   */
  async _handleReceivedCodeChunk(data) {
    const seq = data.seq ?? data.sequenceNumber;
    const position = data.position ?? 0;
    let chunkData = data.msgpart ?? data.data;
    let expectedCrc = data.msgpartcrc;
    if (expectedCrc === undefined && Buffer.isBuffer(chunkData) && chunkData.length > 1) {
      expectedCrc = chunkData[chunkData.length - 1];
      chunkData = chunkData.slice(0, -1 );
    }

    const buffer = this._receiveBuffers[seq];
    if (!buffer) {
      this.log(`[IR-RX]  Unexpected chunk for seq=${seq}, no buffer`);
      return;
    }

    // v5.12.0: Z2M CRC validation  calcArrayCrc = sum of byte values % 256
    if (expectedCrc !== undefined && Buffer.isBuffer(chunkData)) {
      const crc = Array.from(chunkData.values()).reduce((a, b) => a + b, 0) % 0x100;
      if (crc !== expectedCrc) {
        this.error(`[IR-RX] CRC mismatch: got ${crc}, expected ${expectedCrc}`);
        return;
      }
    }

    // v5.12.0: Z2M stores into pre-allocated buffer at position
    if (buffer.buf && Buffer.isBuffer(chunkData)) {
      chunkData.copy(buffer.buf, position);
      buffer.position = position + chunkData.length;
    } else {
      buffer.chunks.push({ position, data: chunkData });
    }
    buffer.receivedLength = Math.max(buffer.receivedLength, position + chunkData.length);
    this.log(` Chunk: pos=${position}, len=${chunkData.length}, total=${buffer.receivedLength}/${buffer.totalLength}`);

    if (buffer.receivedLength >= buffer.totalLength) {
      // v5.9.14: Send Code04 then assemble
      const cl = this._irTransmitCluster;
      if (cl) {
        try { await cl.doneSending({ zero0: 0, seq, zero1: 0 }); } catch (e) { this.log('Code04 err:', e.message); }
      }
      await this._assembleReceivedCode(seq);
    } else {
      // Request next chunk (Code02)
      const cl = this._irTransmitCluster;
      if (cl) {
        try { await cl.codeDataRequest({ seq, position: buffer.receivedLength, maxlen: 0x38 }); } catch (e) { this.log('Code02 err:', e.message); }
      }
    }
  }

  /**
   * v5.5.362: Assemble received chunks into complete IR code
   */
  async _assembleReceivedCode(sequenceNumber) {
    const rcv = this._receiveBuffers[sequenceNumber];
    if (!rcv) { this.log('[IR-RX] No buffer'); return null; }
    try {
      const irCode = rcv.buf ? rcv.buf.toString('base64' ) : (() => {
        rcv.chunks.sort((a, b) => a.position - b.position);
        const b = Buffer.alloc(rcv.totalLength);
        for (const c of rcv.chunks) { if (Buffer.isBuffer(c.data)) c.data.copy(b, c.position); }
        return b.toString('base64');
      })(;
      this.log(`[IR-RX] Assembled: ${irCode.length} chars`);
      delete this._receiveBuffers[sequenceNumber];
      return irCode;
    } catch (err) { this.error('Assemble failed:', err); return null; }
  }

  /**
   * v5.12.0: Z2M Code05 handler  assemble learned code + stop learning
   */
  async _assembleAndFinishLearning(seq) {
    const irCode = await this._assembleReceivedCode(seq);
    if (!irCode) return;
    this.log(`[IR-RX] Learned IR code: ${irCode.substring(0, 80)}...`);
    this._handleLearnedCode(irCode);
    if (this.hasCapability('ir_blaster_code_received')) {
      await this.setCapabilityValue('ir_blaster_code_received', irCode).catch(() => {});
    }
    // Z2M: stop learning with {"study":1}
    const ctrl = this._irControlCluster;
    if (ctrl) {
      try { await ctrl.IRLearn({ data: Buffer.from(JSON.stringify({ study: 1 })) }); } catch (e) { this.log('study:1 err:', e.message); }
    }
    await this._disableLearnMode();
  }

  // Handle Tuya IR datapoint
  // v5.8.1: Enhanced Tuya DP handling for IR blasters without Zosung clusters
  _handleTuyaIRDatapoint(data) {
    this.log('[TUYA-IR] Datapoint received:', JSON.stringify({ dp: data.dp, type: data.datatype, len: data.data?.length }));

    // DP 201: IR code received (learning result)
    if (data.dp === 201 && data.datatype === 3) {
      const code = data.data.toString('base64');
      this.log('[TUYA-IR]  Learned code via DP201:', code.substring(0, 50) + '...');
      this._handleLearnedCode(code);
    }
    // DP 202: Learning status (some devices)
    else if (data.dp === 202) {
      const status = data.data.readUInt8?.(0 ) ?? data.data[0];
      this.log(`[TUYA-IR] Learning status: ${status} (0=idle, 1=learning, 2=success, 3=timeout)`);
      if (status === 2 && this._learningState === 1) {
        this.log('[TUYA-IR]  Learning successful, waiting for code...');
      }
    }
    // DP 1: Some IR blasters use DP1 for learn mode toggle
    else if (data.dp === 1) {
      const learnOn = data.data.readUInt8?.(0 ) ?? data.data[0];
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
    }, {}).catch(() => {};
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

    const irControlCluster = this._irControlCluster;
    this.log(`IR protocol hint: ${protocol} (IRProtocolSet disabled - struct incompatible)`);
  }

  // Set carrier frequency
  async _setCarrierFrequency(frequency) {
    this.log(`Carrier frequency hint: ${frequency}Hz (IRProtocolSet disabled - struct incompatible)`);
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
    for (let i = 0; i < safeMultiply(Math.min(buffer.length, 50)); i += 2) {
      const pulse = buffer.readUInt16BE(i);
      patterns.push(pulse);
    }

    // Find most common frequency indicators
    const avgPulse = patterns.reduce((a, b) => a + b,0, patterns.length);

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
    const maxPatternLength = Math.min(buffer.length * safeMultiply(2, 64));

    for (let len = 8; len <= maxPatternLength; len += 2) {
      const pattern = buffer.slice(0, len);
      const nextPattern = buffer.slice(len,safeMultiply(len, 2));

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

    // v5.9.14: Z2M-compatible field names
    const seq = data.seq ?? data.sequenceNumber;
    const position = data.position ?? 0;
    const maxlen = data.maxlen ?? data.maxLength ?? 0x32;

    if (seq !== this._pendingIRSeq) {
      this.log(`[IR-TX] Seq mismatch: expected ${this._pendingIRSeq}, got ${seq} - syncing`);
      this._pendingIRSeq = seq;
    }

    const part = this._pendingIRMessage.substring(position, position + maxlen);
    const msgpart = Buffer.from(part);
    // Z2M calcStringCrc: sum of char codes % 256
    let crc = 0;
    for (let i = 0; i < part.length; i++) crc = (crc + part.charCodeAt(i)) % 256;

    this.log(`Sending IR chunk: pos=${position}, len=${part.length}, crc=${crc}`);

    if (this._irTransmitCluster) {
      try {
        await this._irTransmitCluster.codeDataResponse({
          zero: 0,
          seq: seq,
          position: position,
          msgpart: Buffer.concat([msgpart, Buffer.from([crc])])
        });
      } catch (err) {
        this.error('Failed to send code data response:', err);
        this._irTransmitReject?.(err );
      }
    }
  }

  // v5.12.0: Handle Code04 from device (sending complete)  respond with Code05 per Z2M
  async _handleTransmitComplete(data) {
    const seq = data.seq ?? data.sequenceNumber;
    // Z2M: send Code05 (doneReceiving) back to device
    const cl = this._irTransmitCluster;
    if (cl) {
      try { await cl.doneReceiving({ seq, zero: 0 }); } catch (e) { this.log('Code05 err:', e.message); }
    }
    if (seq === this._pendingIRSeq) {
      this.log('[IR-TX]  IR transmission completed successfully');
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

    this.log('Sending enhanced IR code with options:', { protocol, frequency, repeat });

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
   * v5.5.606: (SmartIR / Z2M) format support
   */
  async importSmartIRCodes(jsonData, category = 'imported') {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData ) : jsonData;
    let count = 0;
    if (data.commands) {
      for (const [name, code] of Object.entries(data.commands)) {
        const irCode = typeof code === 'string' && code.includes('ir_blaster_code_to_send') 
          ? JSON.parse(code ).ir_code_to_send : code;
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


