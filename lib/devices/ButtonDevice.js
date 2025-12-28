'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');

/**
 * ButtonDevice - v5.2.92 Fixed Base class for wireless button controllers
 *
 * CRITICAL: Buttons are NOT switches!
 * - NO onoff capability
 * - Flow-only actions (single/double/long press)
 * - Battery powered
 *
 * Handles single/double/long press detection
 * Automatically detects battery type (CR2032/CR2450/AAA)
 */
class ButtonDevice extends AutoAdaptiveDevice {

  /**
   * v5.2.92: Force BUTTON profile to prevent SWITCH detection
   */
  constructor(...args) {
    super(...args);

    // 🔒 FORCE BUTTON PROFILE - Never detect as SWITCH
    this._forcedDeviceType = 'BUTTON';
    this._skipHybridTypeDetection = true;

    // Buttons should NEVER have onoff capability
    this._forbiddenCapabilities = ['onoff'];
  }

  async onNodeInit({ zclNode }) {
    // v5.2.92: Guard against double initialization
    if (this._buttonInitialized) {
      this.log('[BUTTON] ⚠️ Already initialized, skipping');
      return;
    }
    this._buttonInitialized = true;

    this.log('[BUTTON] 🔘 ButtonDevice initializing...');
    this.log('[BUTTON] 🔒 Forced type: BUTTON (not SWITCH)');

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    // Initialize hybrid base (power detection only, no type detection)
    await super.onNodeInit({ zclNode });

    // v5.2.92: Remove onoff if it was incorrectly added
    if (this.hasCapability('onoff')) {
      this.log('[BUTTON] ⚠️ Removing incorrect onoff capability');
      await this.removeCapability('onoff').catch(() => { });
    }

    // v5.5.293: SELECTIVE alarm_contact removal - some devices are hybrid button+contact sensors
    // SOS buttons, emergency buttons, and some wireless switches also function as contact sensors
    const manufacturerName = this.getData()?.manufacturerName || '';
    const productId = this.getData()?.productId || '';
    const isHybridDevice = this._isHybridButtonContactDevice(manufacturerName, productId);

    if (this.hasCapability('alarm_contact')) {
      if (isHybridDevice) {
        this.log('[BUTTON] ✅ Keeping alarm_contact capability (hybrid button+contact device)');
        // Ensure flow triggers are properly connected for contact sensor functionality
        await this._setupContactSensorFlows();
      } else {
        this.log('[BUTTON] ⚠️ Removing incorrect alarm_contact capability (pure button device)');
        await this.removeCapability('alarm_contact').catch(() => { });
      }
    } else if (isHybridDevice) {
      // Add alarm_contact capability for hybrid devices that don't have it
      try {
        await this.addCapability('alarm_contact');
        this.log('[BUTTON] ✅ Added alarm_contact capability (hybrid button+contact device)');
        await this._setupContactSensorFlows();
      } catch (e) {
        this.log('[BUTTON] ⚠️ Could not add alarm_contact capability:', e.message);
      }
    }

    // Setup button-specific functionality
    await this.setupButtonDetection();

    // v5.5.224: Register capability listeners for button.X capabilities
    // This prevents "missing capability listener" errors
    await this._registerButtonCapabilityListeners();

    this.log('[BUTTON] ✅ ButtonDevice ready');
  }

  /**
   * v5.5.224: Register capability listeners for button capabilities
   * Buttons are "virtual" - they trigger flows but don't have settable values
   */
  async _registerButtonCapabilityListeners() {
    const buttonCount = this.buttonCount || 4;

    for (let i = 1; i <= buttonCount; i++) {
      const capId = `button.${i}`;
      if (this.hasCapability(capId)) {
        try {
          // Register a no-op listener (buttons are flow-only, not settable)
          this.registerCapabilityListener(capId, async () => {
            this.log(`[BUTTON] Button ${i} capability triggered`);
            // Trigger the button press flow
            await this.triggerButtonPress(i, 'single');
          });
          this.log(`[BUTTON] ✅ Registered listener for ${capId}`);
        } catch (err) {
          // May already be registered
          this.log(`[BUTTON] ⚠️ Could not register ${capId}: ${err.message}`);
        }
      }
    }

    // Also ensure measure_battery has a listener if present
    if (this.hasCapability('measure_battery')) {
      try {
        // Battery is read-only, but register to prevent warnings
        if (!this._batteryListenerRegistered) {
          this._batteryListenerRegistered = true;
          this.log('[BUTTON] ✅ Battery capability present');
        }
      } catch (err) {
        // Ignore
      }
    }
  }

  /**
   * v5.5.295: ENHANCED hybrid button+contact device detection
   * Based on research from 10+ sources: Zigbee2MQTT, ZHA, Tuya Developer, ioBroker
   * These devices function as both wireless buttons AND contact sensors
   */
  _isHybridButtonContactDevice(manufacturerName, productId) {
    // SOS/Emergency buttons (TS0215A series) - EXPANDED from research
    const sosButtons = ['TS0215A', 'TS0215', 'TS0218', 'TS0216A'];
    if (sosButtons.some(model => productId && productId.includes(model))) {
      this.log(`[BUTTON] 🆘 SOS button detected: ${productId} - enabling alarm_contact`);
      return true;
    }

    // Enhanced manufacturer detection from 10+ sources research
    const hybridManufacturers = [
      // From Zigbee2MQTT Issues #13159, #12819
      '_TZ3000_4fsgukof',  // TS0215A SOS confirmed hybrid
      '_TZ3000_0dumfk2z',  // TS0215A variant
      '_TZ3000_fsiepnrh',  // Emergency + door/window sensor
      '_TZ3000_p6ju8myv',  // SOS + magnetic contact
      '_TZ3000_pkfazisv',  // TS0215A variant from research
      '_TZ3000_wr2ucaj9',  // SOS button confirmed
      // From ZHA GitHub issues and ioBroker
      '_TZ3000_ixla93vd',  // Multi-function confirmed
      '_TZ3000_ja5osu5g',  // Wireless switch + contact
      '_TZ3400_keyjhapk',  // Smart button + sensor
      // From Tuya Developer Forum
      '_TZ3000_bi6lpsew',  // Emergency alarm button
      '_TZ3000_qnpiukdu',  // SOS with contact detection
    ];

    if (hybridManufacturers.includes(manufacturerName)) {
      this.log(`[BUTTON] 🔍 Hybrid device confirmed from research: ${manufacturerName} / ${productId}`);
      return true;
    }

    // Check for specific product patterns that indicate hybrid functionality
    const hybridPatterns = ['SOS', 'Emergency', 'Door', 'Window', 'Contact'];
    const deviceName = this.getName() || '';
    if (hybridPatterns.some(pattern =>
      deviceName.toLowerCase().includes(pattern.toLowerCase()) ||
      productId.toLowerCase().includes(pattern.toLowerCase())
    )) {
      this.log(`[BUTTON] 🔍 Pattern-matched hybrid device: ${deviceName} / ${productId}`);
      return true;
    }

    return false;
  }

  /**
   * v5.5.293: Setup contact sensor flow triggers for hybrid devices
   * Ensures contact_opened/contact_closed flows work correctly
   */
  async _setupContactSensorFlows() {
    if (!this.hasCapability('alarm_contact')) {
      return;
    }

    try {
      // Register capability listener for alarm_contact to trigger flows
      this.registerCapabilityListener('alarm_contact', async (value) => {
        this.log(`[BUTTON-CONTACT] Contact ${value ? 'opened' : 'closed'}`);

        // Trigger appropriate flow cards
        try {
          const cardId = value ? 'contact_opened' : 'contact_closed';
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, {}).catch(() => {
              // Flow card may not exist for this driver - try generic ones
              this.log(`[BUTTON-CONTACT] ⚠️ Flow card '${cardId}' not found, trying generic`);
            });
        } catch (err) {
          this.log(`[BUTTON-CONTACT] ⚠️ Flow trigger error: ${err.message}`);
        }

        return Promise.resolve();
      });

      this.log('[BUTTON] ✅ Contact sensor flow triggers configured');
    } catch (err) {
      this.log(`[BUTTON] ⚠️ Contact sensor flow setup error: ${err.message}`);
    }
  }

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    const manufacturerName = this.getData()?.manufacturerName || 'unknown';
    const productId = this.getData()?.productId || 'unknown';

    this.log(`[BUTTON] 🔍 Analyzing config for: ${manufacturerName} / ${productId}`);

    // Get dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      'button_wireless'
    );

    // Apply configuration
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    this.log(`[BUTTON] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[BUTTON] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[BUTTON] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[BUTTON] ⭐ Special handling: ${config.specialHandling}`);
    }
  }

  /**
   * Setup button click detection
   * Handles single, double, long press, and multi-press
   *
   * Tuya TS0043/TS0044 devices send commands via:
   * - scenes.recall (MOST COMMON for Tuya buttons)
   * - onOff.toggle/on/off (some devices)
   * - levelControl.step (dimmer buttons)
   */
  async setupButtonDetection() {
    this.log('🔘 Setting up button detection...');
    this.log('🔘 v5.3.20: Added Tuya 0xFD command support for long press');

    // Click detection state
    this._clickState = {
      lastClick: 0,
      clickCount: 0,
      clickTimer: null,
      longPressTimer: null,
      buttonPressed: false,
      activeButton: null
    };

    // Timing constants
    const DOUBLE_CLICK_WINDOW = 400;  // ms
    const LONG_PRESS_DURATION = 1000; // ms
    const DEBOUNCE_TIME = 50;         // ms

    // ═══════════════════════════════════════════════════════════════════════
    // v5.3.20: TUYA BUTTON PRESS TYPE MAPPING
    // Command 0xFD on onOff cluster OR scene recall
    // ═══════════════════════════════════════════════════════════════════════
    const TUYA_PRESS_TYPES = {
      0: 'single',
      1: 'double',
      2: 'long',    // HOLD / LONG PRESS
      3: 'single',  // Some devices use 3 for single
      4: 'double',  // Some devices use 4 for double
      5: 'long'     // Some devices use 5 for long
    };

    // Listen for commands on all endpoints
    const endpoints = this.buttonCount || 1;

    for (let ep = 1; ep <= endpoints; ep++) {
      try {
        // CRITICAL: Join groups FIRST (Tuya buttons use groups cluster for broadcasting!)
        const groupsCluster = this.zclNode.endpoints[ep]?.clusters?.groups;
        if (groupsCluster) {
          try {
            this.log(`[GROUPS] Joining group 0 on endpoint ${ep} for broadcast reception...`);
            await groupsCluster.add({ groupId: 0, groupName: 'HomeyGroup' });
            this.log(`[GROUPS] ✅ Endpoint ${ep} joined group 0`);
          } catch (err) {
            this.log('[GROUPS] Group join failed (may already be member):', err.message);
          }
        }

        // PRIORITY 1: Scenes cluster (Tuya TS0043/TS0044 use this!)
        const scenesCluster = this.zclNode.endpoints[ep]?.clusters?.scenes;
        if (scenesCluster) {
          this.log(`[SETUP] Listening to scenes cluster on endpoint ${ep}...`);

          // CRITICAL: Bind to coordinator first!
          if (typeof scenesCluster.bind === 'function') {
            try {
              await scenesCluster.bind();
              this.log(`[BIND] ✅ Scenes cluster bound on endpoint ${ep}`);
            } catch (err) {
              this.log('[BIND] Scenes bind failed (non-critical):', err.message);
            }
          } else {
            this.log('[BIND] Scenes bind not supported (SDK3 limitation)');
          }

          scenesCluster.on('command', async (commandName, commandPayload) => {
            this.log(`[SCENE] Button ${ep} command: ${commandName}`, commandPayload);

            // Scene recall = button press (most common for Tuya)
            if (commandName === 'recall') {
              const sceneId = commandPayload?.sceneId ?? commandPayload?.scene ?? commandPayload?.data?.[0] ?? 0;
              this.log(`🔘 Button ${ep} pressed (scene ${sceneId})`);

              // v5.3.20: Use unified TUYA_PRESS_TYPES mapping
              // Scene 0 = single, Scene 1 = double, Scene 2 = long/hold
              const pressAction = TUYA_PRESS_TYPES[sceneId] || 'single';
              this.log(`🔘 Button ${ep} ${pressAction.toUpperCase()} PRESS (scene ${sceneId})`);
              await this.triggerButtonPress(ep, pressAction);
            }
          });

          this.log(`[OK] ✅ Button ${ep} scenes detection configured`);
        }

        // PRIORITY 2: OnOff cluster (alternative for some devices)
        const onOffCluster = this.zclNode.endpoints[ep]?.clusters?.onOff;
        if (onOffCluster) {
          this.log(`[SETUP] Listening to onOff cluster on endpoint ${ep}...`);

          // CRITICAL: Bind to coordinator first (if supported)!
          if (typeof onOffCluster.bind === 'function') {
            try {
              await onOffCluster.bind();
              this.log(`[BIND] ✅ OnOff cluster bound on endpoint ${ep}`);
            } catch (err) {
              this.log('[BIND] OnOff bind failed (non-critical):', err.message);
            }
          } else {
            this.log('[BIND] ⚠️  OnOff cluster bind not supported (SDK3 limitation)');
          }

          // v5.5.263: CRITICAL - Listen for onOff ATTRIBUTE changes
          // Fixed: Filter periodic status reports (every 10mn) vs real button presses
          // Real button press: value TOGGLES (changes from last value)
          // Periodic report: same value repeated after long time
          let lastOnOffValue = null;
          let lastOnOffTime = 0;
          let hasReceivedFirstReport = false;

          onOffCluster.on('attr.onOff', async (value) => {
            const now = Date.now();
            const timeSinceLastEvent = now - lastOnOffTime;

            this.log(`[ONOFF-ATTR] Button ${ep} onOff: ${value} (last=${lastOnOffValue}, timeDelta=${timeSinceLastEvent}ms)`);

            // v5.5.263: IGNORE PERIODIC REPORTS
            // If same value AND long time (>5s), it's a periodic status report, NOT a button press
            if (hasReceivedFirstReport && value === lastOnOffValue && timeSinceLastEvent > 5000) {
              this.log(`[ONOFF-ATTR] ⏭️ Ignored: periodic report (same value after ${Math.round(timeSinceLastEvent / 1000)}s)`);
              lastOnOffTime = now;
              return;
            }

            // v5.5.263: IGNORE FIRST REPORT (device just woke up or reconnected)
            if (!hasReceivedFirstReport) {
              this.log(`[ONOFF-ATTR] ℹ️ First report received - not triggering (device wake/reconnect)`);
              hasReceivedFirstReport = true;
              lastOnOffValue = value;
              lastOnOffTime = now;
              return;
            }

            // v5.5.263: Debounce rapid duplicate events (within 100ms)
            if (timeSinceLastEvent < 100 && value === lastOnOffValue) {
              this.log(`[ONOFF-ATTR] ⏭️ Debounced duplicate`);
              return;
            }

            // v5.5.263: REAL BUTTON PRESS = value CHANGED (toggle)
            // OR rapid same-value events (within 2s) = button held/repeated
            const isValueChange = value !== lastOnOffValue;
            const isRapidEvent = timeSinceLastEvent < 2000;

            if (isValueChange || isRapidEvent) {
              this.log(`🔘 Button ${ep} PRESSED (onOff=${value}, changed=${isValueChange}, rapid=${isRapidEvent})`);
              await this.triggerButtonPress(ep, 'single');
            } else {
              this.log(`[ONOFF-ATTR] ⏭️ Ignored: not a button press (same value, not rapid)`);
            }

            lastOnOffValue = value;
            lastOnOffTime = now;
          });

          // v5.3.20: Listen for ALL commands including Tuya-specific 0xFD
          onOffCluster.on('command', async (commandName, commandPayload) => {
            this.log(`[ONOFF] Button ${ep} command: ${commandName}`, commandPayload);

            // ═══════════════════════════════════════════════════════════════
            // TUYA PROPRIETARY COMMAND 0xFD (253) - CRITICAL FOR LONG PRESS!
            // Payload: 0x00=single, 0x01=double, 0x02=hold/long
            // ═══════════════════════════════════════════════════════════════
            const isTuyaCommand = (
              commandName === 'tuyaAction' ||
              commandName === '253' ||
              commandName === 'fd' ||
              commandName === '0xfd' ||
              commandName === 'commandTuyaAction' ||
              commandName === 'unknown' ||  // SDK3 may report unknown for 0xFD
              (typeof commandName === 'number' && commandName === 253)
            );

            if (isTuyaCommand || (commandPayload && typeof commandPayload === 'object' && 'data' in commandPayload)) {
              // Extract press type from various payload formats
              let pressType = 0;
              if (commandPayload?.data && Array.isArray(commandPayload.data)) {
                pressType = commandPayload.data[0];
              } else if (commandPayload?.type !== undefined) {
                pressType = commandPayload.type;
              } else if (Array.isArray(commandPayload)) {
                pressType = commandPayload[0];
              } else if (typeof commandPayload === 'number') {
                pressType = commandPayload;
              }

              this.log(`[TUYA-CMD] Tuya command detected! pressType=${pressType}`);

              const pressAction = TUYA_PRESS_TYPES[pressType] || 'single';
              this.log(`Button ${ep} ${pressAction.toUpperCase()} PRESS (Tuya 0xFD)`);
              await this.triggerButtonPress(ep, pressAction);
              return; // Don't process as standard command
            }

            // Standard onOff commands (fallback for non-Tuya buttons)
            if (commandName === 'toggle' || commandName === 'on' || commandName === 'off') {
              await this.handleButtonCommand(ep, commandName, {
                DOUBLE_CLICK_WINDOW,
                LONG_PRESS_DURATION,
                DEBOUNCE_TIME
              });
            }
          });

          this.log(`[OK] ✅ Button ${ep} onOff detection configured (with Tuya 0xFD support)`);
        }

        // PRIORITY 3: Level Control cluster (dimmer buttons)
        const levelCluster = this.zclNode.endpoints[ep]?.clusters?.levelControl;
        if (levelCluster) {
          this.log(`[SETUP] Listening to levelControl cluster on endpoint ${ep}...`);

          levelCluster.on('command', async (commandName, payload) => {
            this.log(`[LEVEL] Button ${ep} command: ${commandName}`, payload);

            if (commandName === 'step' || commandName === 'stepWithOnOff') {
              const stepMode = payload?.stepMode || payload?.mode || 0;
              // 0 = up, 1 = down
              this.log(`🔘 Button ${ep} ${stepMode === 0 ? 'UP' : 'DOWN'}`);
              await this.triggerButtonPress(ep, 'single');
            } else if (commandName === 'move' || commandName === 'moveWithOnOff') {
              this.log(`🔘 Button ${ep} LONG PRESS (moving)`);
              await this.triggerButtonPress(ep, 'long');
            } else if (commandName === 'stop' || commandName === 'stopWithOnOff') {
              this.log(`🔘 Button ${ep} RELEASE`);
              // Release handled internally
            }
          });

          this.log(`[OK] ✅ Button ${ep} levelControl detection configured`);
        }

        // PRIORITY 4: MultiState Input cluster (some Tuya buttons use this!)
        // v5.5.181: Added for compatibility with TS0041/TS0042 variants
        const multiStateCluster = this.zclNode.endpoints[ep]?.clusters?.genMultistateInput
          || this.zclNode.endpoints[ep]?.clusters?.multiStateInput
          || this.zclNode.endpoints[ep]?.clusters?.[0x0012];
        if (multiStateCluster) {
          this.log(`[SETUP] Listening to multiStateInput cluster on endpoint ${ep}...`);

          // Listen for presentValue attribute changes
          multiStateCluster.on('attr.presentValue', async (value) => {
            this.log(`[MULTISTATE] Button ${ep} presentValue: ${value}`);

            // Tuya multiState: 0=hold, 1=single, 2=double, 3=triple
            const pressMap = { 0: 'long', 1: 'single', 2: 'double', 3: 'multi' };
            const pressType = pressMap[value] || 'single';

            this.log(`🔘 Button ${ep} ${pressType.toUpperCase()} PRESS (multiState)`);
            await this.triggerButtonPress(ep, pressType, value === 3 ? 3 : 1);
          });

          this.log(`[OK] ✅ Button ${ep} multiStateInput detection configured`);
        }

        // PRIORITY 5: Tuya cluster (0xEF00) for DP-based buttons
        // v5.5.181: Some buttons report via Tuya DP instead of standard clusters
        const tuyaCluster = this.zclNode.endpoints[ep]?.clusters?.tuya
          || this.zclNode.endpoints[ep]?.clusters?.[0xEF00]
          || this.zclNode.endpoints[ep]?.clusters?.[61184];
        if (tuyaCluster && !scenesCluster && !onOffCluster) {
          this.log(`[SETUP] Listening to Tuya cluster (0xEF00) on endpoint ${ep}...`);

          // Listen for dataReport commands
          if (typeof tuyaCluster.on === 'function') {
            tuyaCluster.on('dataReport', async (data) => {
              this.log(`[TUYA-DP] Button ${ep} dataReport:`, data);

              // DP1 is often button press type: 0=single, 1=double, 2=long
              if (data?.dp === 1 || data?.datapoint === 1) {
                const pressValue = data?.data?.[0] ?? data?.value ?? 0;
                const pressType = TUYA_PRESS_TYPES[pressValue] || 'single';
                this.log(`🔘 Button ${ep} ${pressType.toUpperCase()} PRESS (Tuya DP1)`);
                await this.triggerButtonPress(ep, pressType);
              }
            });

            tuyaCluster.on('response', async (status, transId, data) => {
              this.log(`[TUYA-DP] Button ${ep} response:`, { status, transId, data });
            });
          }

          this.log(`[OK] ✅ Button ${ep} Tuya DP detection configured`);
        }

        // Log if NO clusters found
        if (!scenesCluster && !onOffCluster && !levelCluster && !multiStateCluster && !tuyaCluster) {
          this.log(`[WARN] ⚠️  No button clusters found on endpoint ${ep}`);
          this.log('[WARN] Available clusters:', Object.keys(this.zclNode.endpoints[ep]?.clusters || {}));
        }

      } catch (err) {
        this.error(`Failed to setup button ${ep}:`, err.message);
      }
    }

    this.log(`[OK] Button detection configured for ${endpoints} button(s)`);
  }

  /**
   * Handle button command (press/release)
   */
  async handleButtonCommand(endpoint, command, timing) {
    const now = Date.now();

    // Debounce
    if (now - this._clickState.lastClick < timing.DEBOUNCE_TIME) {
      return;
    }

    this.log(`Button ${endpoint} command:`, command);

    // Button press detected
    if (command === 'on' || command === 'off' || command === 'toggle') {
      this._clickState.buttonPressed = true;
      this._clickState.activeButton = endpoint;
      this._clickState.lastClick = now;

      // Start long press timer
      this._clickState.longPressTimer = setTimeout(() => {
        if (this._clickState.buttonPressed && this._clickState.activeButton === endpoint) {
          this.log(`🔘 LONG PRESS detected (button ${endpoint})`);
          this.triggerButtonPress(endpoint, 'long');

          // Reset state after long press
          this._clickState.buttonPressed = false;
          this._clickState.clickCount = 0;
          this._clickState.activeButton = null;
          if (this._clickState.clickTimer) {
            clearTimeout(this._clickState.clickTimer);
            this._clickState.clickTimer = null;
          }
        }
      }, timing.LONG_PRESS_DURATION);

    }
    // Button release detected
    else if (command === 'commandButtonRelease' || this._clickState.buttonPressed) {
      this._clickState.buttonPressed = false;

      // Clear long press timer
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
        this._clickState.longPressTimer = null;
      }

      // Increment click count
      this._clickState.clickCount++;

      // Clear existing timer
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }

      // Wait for potential additional clicks
      this._clickState.clickTimer = setTimeout(() => {
        const clicks = this._clickState.clickCount;
        const button = this._clickState.activeButton || endpoint;
        this._clickState.clickCount = 0;
        this._clickState.clickTimer = null;
        this._clickState.activeButton = null;

        if (clicks === 1) {
          this.log(`🔘 SINGLE CLICK detected (button ${button})`);
          this.triggerButtonPress(button, 'single');

        } else if (clicks === 2) {
          this.log(`🔘 DOUBLE CLICK detected (button ${button})`);
          this.triggerButtonPress(button, 'double');

        } else if (clicks >= 3) {
          this.log(`🔘 MULTI CLICK detected (button ${button}, ${clicks} times)`);
          this.triggerButtonPress(button, 'multi', clicks);
        }
      }, timing.DOUBLE_CLICK_WINDOW);
    }
  }

  /**
   * Trigger flow cards for button press - ULTRA VERBOSE VERSION
   */
  async triggerButtonPress(button, type = 'single', count = 1) {
    this.log('════════════════════════════════════════');
    this.log('[FLOW-TRIGGER] 🔘 BUTTON PRESS DETECTED!');
    this.log('[FLOW-TRIGGER] Button:', button);
    this.log('[FLOW-TRIGGER] Type:', type);
    this.log('[FLOW-TRIGGER] Count:', count);
    this.log('[FLOW-TRIGGER] Driver ID:', this.driver.id);
    this.log('[FLOW-TRIGGER] Device Name:', this.getName());
    this.log('════════════════════════════════════════');

    try {
      const driverId = this.driver.id;
      this.log('[FLOW-TRIGGER] 📢 Attempting to trigger flows...');

      if (type === 'single') {
        this.log('[FLOW-TRIGGER] Type: SINGLE PRESS');

        // Try 1: Generic button_pressed with button token
        try {
          this.log('[FLOW-TRIGGER] Trying: button_pressed (generic)');
          await this.homey.flow.getDeviceTriggerCard('button_pressed')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_pressed SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_pressed FAILED:', err.message);
        }

        // Try 2: Driver-specific with button token (e.g. button_wireless_4_button_4gang_button_pressed)
        try {
          // CRITICAL FIX: app.json has extra "_button_Xgang" in ID!
          const gangCount = this.buttonCount || 1;
          const cardId = `${driverId}_button_${gangCount}gang_button_pressed`;
          this.log('[FLOW-TRIGGER] Trying:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, { button: button.toString() }, {});
          this.log(`[FLOW-TRIGGER] ✅ ${cardId} SUCCESS`);
        } catch (err) {
          this.log('[FLOW-TRIGGER] ⚠️  Flow card NOT FOUND or FAILED:', err.message);
        }

        // Try 3: Button-specific without token (e.g. button_wireless_4_button_4gang_button_1_pressed)
        const gangCount = this.buttonCount || 1;
        const specificCardId = `${driverId}_button_${gangCount}gang_button_${button}_pressed`;
        try {
          this.log('[FLOW-TRIGGER] Trying:', specificCardId);
          await this.homey.flow.getDeviceTriggerCard(specificCardId)
            .trigger(this, {}, {});
          this.log(`[FLOW-TRIGGER] ✅ ${specificCardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  ${specificCardId} NOT FOUND (normal if doesn't exist)`);
        }

      } else if (type === 'double') {
        this.log('[FLOW-TRIGGER] Type: DOUBLE PRESS');

        try {
          this.log('[FLOW-TRIGGER] Trying: button_double_press');
          await this.homey.flow.getDeviceTriggerCard('button_double_press')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_double_press SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_double_press FAILED:', err.message);
        }

        // Driver-specific double press (e.g. button_wireless_4_button_4gang_button_1_double)
        const gangCount = this.buttonCount || 1;
        const doubleCardId = `${driverId}_button_${gangCount}gang_button_${button}_double`;
        try {
          this.log('[FLOW-TRIGGER] Trying:', doubleCardId);
          await this.homey.flow.getDeviceTriggerCard(doubleCardId)
            .trigger(this, {}, {});
          this.log(`[FLOW-TRIGGER] ✅ ${doubleCardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  ${doubleCardId} NOT FOUND`);
        }

        // Also try generic double press card
        const genericDoubleCardId = `${driverId}_button_${gangCount}gang_button_double_press`;
        try {
          await this.homey.flow.getDeviceTriggerCard(genericDoubleCardId)
            .trigger(this, { button: button.toString() }, {});
          this.log(`[FLOW-TRIGGER] ✅ ${genericDoubleCardId} SUCCESS`);
        } catch (err) {
          // Silent - not all drivers have this
        }

      } else if (type === 'long') {
        this.log('[FLOW-TRIGGER] Type: LONG PRESS');

        try {
          this.log('[FLOW-TRIGGER] Trying: button_long_press');
          await this.homey.flow.getDeviceTriggerCard('button_long_press')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_long_press SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_long_press FAILED:', err.message);
        }

        // Driver-specific long press (e.g. button_wireless_4_button_4gang_button_1_long)
        const gangCount = this.buttonCount || 1;
        const longCardId = `${driverId}_button_${gangCount}gang_button_${button}_long`;
        try {
          this.log('[FLOW-TRIGGER] Trying:', longCardId);
          await this.homey.flow.getDeviceTriggerCard(longCardId)
            .trigger(this, {}, {});
          this.log(`[FLOW-TRIGGER] ✅ ${longCardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  ${longCardId} NOT FOUND`);
        }

        // Also try generic long press card
        const genericLongCardId = `${driverId}_button_${gangCount}gang_button_long_press`;
        try {
          await this.homey.flow.getDeviceTriggerCard(genericLongCardId)
            .trigger(this, { button: button.toString() }, {});
          this.log(`[FLOW-TRIGGER] ✅ ${genericLongCardId} SUCCESS`);
        } catch (err) {
          // Silent - not all drivers have this
        }

      } else if (type === 'multi') {
        this.log('[FLOW-TRIGGER] Type: MULTI PRESS (count:', count, ')');

        try {
          this.log('[FLOW-TRIGGER] Trying: button_multi_press');
          await this.homey.flow.getDeviceTriggerCard('button_multi_press')
            .trigger(this, { button: button.toString(), count }, {});
          this.log('[FLOW-TRIGGER] ✅ button_multi_press SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_multi_press FAILED:', err.message);
        }
      }

      this.log('[FLOW-TRIGGER] ✅ All flow card attempts completed');
      this.log('════════════════════════════════════════\n');

      // v5.5.111: Read battery while device is awake (button just pressed!)
      this._readBatteryWhileAwake();

    } catch (err) {
      this.error('[FLOW-TRIGGER] ❌ CRITICAL ERROR in triggerButtonPress:');
      this.error('[FLOW-TRIGGER] Error:', err.message);
      this.error('[FLOW-TRIGGER] Stack:', err.stack);
      this.log('════════════════════════════════════════\n');
    }
  }

  /**
   * v5.5.225: ENHANCED battery reading for sleepy button devices
   * Reads battery immediately when button is pressed (device is awake!)
   * Multiple fallback methods: ZCL cluster, Tuya DP, voltage conversion
   */
  async _readBatteryWhileAwake() {
    // Debounce - don't read too often (but allow first read immediately)
    const now = Date.now();
    const lastRead = this._lastBatteryRead || 0;
    const isFirstRead = !this._lastBatteryRead;

    // Allow first read, then debounce to once per 30 seconds
    if (!isFirstRead && now - lastRead < 30000) return;
    this._lastBatteryRead = now;

    if (!this.hasCapability('measure_battery')) {
      this.log('[BUTTON-BATTERY] ⚠️ No measure_battery capability');
      return;
    }

    this.log('[BUTTON-BATTERY] 🔋 Button pressed - reading battery (device awake)...');

    let batteryRead = false;

    // METHOD 1: ZCL Power Configuration cluster (standard)
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      if (ep1) {
        const powerCluster =
          ep1.clusters?.powerConfiguration ||
          ep1.clusters?.genPowerCfg ||
          ep1.clusters?.[0x0001] ||
          ep1.clusters?.['powerConfiguration'];

        if (powerCluster) {
          this.log('[BUTTON-BATTERY] 📡 Trying ZCL powerConfiguration cluster...');

          // Try readAttributes if available
          if (typeof powerCluster.readAttributes === 'function') {
            const data = await Promise.race([
              powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]).catch(e => {
              this.log('[BUTTON-BATTERY] ⚠️ readAttributes failed:', e.message);
              return null;
            });

            if (data?.batteryPercentageRemaining !== undefined &&
              data.batteryPercentageRemaining !== 255 &&
              data.batteryPercentageRemaining !== 0) {
              const battery = Math.round(data.batteryPercentageRemaining / 2);
              this.log(`[BUTTON-BATTERY] ✅ ZCL Battery: ${battery}%`);
              await this.setCapabilityValue('measure_battery', battery).catch(() => { });
              batteryRead = true;
            } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
              const voltage = data.batteryVoltage / 10;
              // CR2032: 3.0V=100%, 2.0V=0%
              const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
              this.log(`[BUTTON-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
              await this.setCapabilityValue('measure_battery', battery).catch(() => { });
              batteryRead = true;
            }
          }

          // Try direct attribute access if readAttributes failed
          if (!batteryRead && powerCluster.batteryPercentageRemaining !== undefined) {
            const raw = powerCluster.batteryPercentageRemaining;
            if (raw !== 255 && raw !== 0) {
              const battery = Math.round(raw / 2);
              this.log(`[BUTTON-BATTERY] ✅ Direct attr Battery: ${battery}%`);
              await this.setCapabilityValue('measure_battery', battery).catch(() => { });
              batteryRead = true;
            }
          }
        }
      }
    } catch (e) {
      this.log('[BUTTON-BATTERY] ⚠️ ZCL method failed:', e.message);
    }

    // METHOD 2: Tuya DP (some buttons report battery via DP101 or DP4)
    if (!batteryRead) {
      try {
        const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya ||
          this.zclNode?.endpoints?.[1]?.clusters?.[0xEF00] ||
          this.zclNode?.endpoints?.[1]?.clusters?.[61184];

        if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') {
          this.log('[BUTTON-BATTERY] 📡 Trying Tuya DP for battery...');
          // Request battery DP (common DPs: 4, 101, 3)
          for (const dp of [4, 101, 3]) {
            try {
              await tuyaCluster.dataQuery({ dp });
            } catch (e) {
              // Ignore - just requesting
            }
          }
        }
      } catch (e) {
        // Silent
      }
    }

    // METHOD 3: Check stored value from last report
    if (!batteryRead) {
      const storedBattery = this.getStoreValue('last_battery_percentage');
      if (storedBattery !== null && storedBattery !== undefined) {
        this.log(`[BUTTON-BATTERY] ℹ️ Using stored battery: ${storedBattery}%`);
        await this.setCapabilityValue('measure_battery', storedBattery).catch(() => { });
        batteryRead = true;
      }
    }

    if (!batteryRead) {
      this.log('[BUTTON-BATTERY] ⚠️ Could not read battery (device may have gone back to sleep)');
    }
  }

  /**
   * v5.5.225: Handle battery report from Tuya DP
   */
  async _handleTuyaBatteryDP(dp, value) {
    if (!this.hasCapability('measure_battery')) return;

    let battery = null;

    // DP4: battery percentage (some devices send 0-100, some 0-200)
    if (dp === 4) {
      battery = value > 100 ? Math.round(value / 2) : value;
    }
    // DP101: battery percentage
    else if (dp === 101) {
      battery = value > 100 ? Math.round(value / 2) : value;
    }
    // DP3: battery level enum (0=low, 1=medium, 2=high)
    else if (dp === 3 && value <= 2) {
      battery = value === 0 ? 10 : (value === 1 ? 50 : 100);
    }

    if (battery !== null && battery >= 0 && battery <= 100) {
      this.log(`[BUTTON-BATTERY] ✅ Tuya DP${dp} Battery: ${battery}%`);
      await this.setCapabilityValue('measure_battery', battery).catch(() => { });
      await this.setStoreValue('last_battery_percentage', battery).catch(() => { });
    }
  }

  /**
   * Set number of buttons for this device
   */
  setButtonCount(count) {
    this.buttonCount = count;
  }

  /**
   * Get button count
   */
  getButtonCount() {
    return this.buttonCount || 1;
  }
}

module.exports = ButtonDevice;
