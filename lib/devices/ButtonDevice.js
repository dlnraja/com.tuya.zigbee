'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');

/**
 * ButtonDevice - v5.5.490 PHYSICAL BUTTON FIX
 *
 * CRITICAL FIX: Physical buttons not triggering flows while virtual buttons work
 * Root cause: Missing cluster bindings + incomplete command listener patterns
 *
 * v5.5.490: COMPREHENSIVE PHYSICAL BUTTON FIX
 * - Enhanced cluster binding at init (scenes, onOff, groups)
 * - Multiple command listener patterns for SDK3 compatibility
 * - Support for commandOn/commandOff/commandToggle (not just 'command' event)
 * - Group 0 join for broadcast button events
 * - Tuya 0xFD command support for long press
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
   * v5.5.455: FAST INIT MODE for sleepy battery buttons
   * Buttons go to sleep very quickly - defer complex initialization
   * to prevent pairing timeout and "not awake long enough" issues
   */
  get fastInitMode() { return true; }

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

    // v5.5.452: CRITICAL - Ensure capabilities exist FIRST (devices paired before fix had none!)
    await this._ensureDynamicCapabilities();

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
   * v5.5.452: Dynamically ensure button capabilities exist
   * Homey SDK3 supports addCapability/removeCapability at runtime!
   * This fixes devices that were paired before capabilities were defined.
   */
  async _ensureDynamicCapabilities() {
    const buttonCount = this.buttonCount || 4;
    this.log(`[BUTTON] 🔄 Checking dynamic capabilities for ${buttonCount} buttons...`);

    // Build required capabilities list based on buttonCount
    const requiredCapabilities = [];
    for (let i = 1; i <= buttonCount; i++) {
      requiredCapabilities.push(`button.${i}`);
    }
    requiredCapabilities.push('measure_battery');

    // Track what was added/removed
    let added = 0;
    let removed = 0;

    // Add missing capabilities
    for (const cap of requiredCapabilities) {
      if (!this.hasCapability(cap)) {
        this.log(`[BUTTON] ➕ Adding missing capability: ${cap}`);
        try {
          await this.addCapability(cap);
          added++;
          this.log(`[BUTTON] ✅ Added: ${cap}`);
        } catch (err) {
          this.error(`[BUTTON] ❌ Failed to add ${cap}:`, err.message);
        }
      }
    }

    // Remove forbidden capabilities (onoff should never be on a button!)
    const forbiddenCaps = ['onoff', 'alarm_motion'];
    for (const cap of forbiddenCaps) {
      if (this.hasCapability(cap)) {
        this.log(`[BUTTON] ➖ Removing forbidden capability: ${cap}`);
        try {
          await this.removeCapability(cap);
          removed++;
          this.log(`[BUTTON] ✅ Removed: ${cap}`);
        } catch (err) {
          this.error(`[BUTTON] ❌ Failed to remove ${cap}:`, err.message);
        }
      }
    }

    // Log summary
    if (added > 0 || removed > 0) {
      this.log(`[BUTTON] 📊 Dynamic capabilities: +${added} added, -${removed} removed`);
    } else {
      this.log(`[BUTTON] ✅ All capabilities already present`);
    }

    // Return current capabilities for logging
    return this.getCapabilities();
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
   * v5.5.310: Setup contact sensor flow triggers for hybrid devices
   * Ensures contact_opened/contact_closed flows work correctly
   * Also binds to IAS Zone cluster (1280) for hybrid SOS/emergency buttons
   */
  async _setupContactSensorFlows() {
    if (!this.hasCapability('alarm_contact')) {
      return;
    }

    // v5.5.310: Dynamic IAS Zone binding for hybrid devices only
    // This was removed from driver.compose.json to fix binding failures on pure buttons
    try {
      const ep = this.zclNode?.endpoints?.[1];
      const iasZoneCluster = ep?.clusters?.iasZone || ep?.clusters?.ssIasZone || ep?.clusters?.[1280];
      if (iasZoneCluster && typeof iasZoneCluster.bind === 'function') {
        await iasZoneCluster.bind();
        this.log('[BUTTON] ✅ IAS Zone cluster bound for hybrid device');
      }
    } catch (bindErr) {
      this.log('[BUTTON] ⚠️ IAS Zone bind skipped:', bindErr.message);
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
        // v5.5.307: DIAGNOSTIC - Log available clusters for debugging physical button issues
        const availableClusters = Object.keys(this.zclNode.endpoints[ep]?.clusters || {});
        this.log(`[DIAG] EP${ep} available clusters: ${availableClusters.join(', ') || 'NONE'}`);

        // CRITICAL: Join groups FIRST (Tuya buttons use groups cluster for broadcasting!)
        // v5.5.371: SDK3 FIX - Use correct method name (addGroup vs add)
        const groupsCluster = this.zclNode.endpoints[ep]?.clusters?.groups
          || this.zclNode.endpoints[ep]?.clusters?.genGroups
          || this.zclNode.endpoints[ep]?.clusters?.[4];
        if (groupsCluster) {
          try {
            this.log(`[GROUPS] Joining group 0 on endpoint ${ep} for broadcast reception...`);
            // v5.5.371: SDK3 uses addGroup(), not add()
            if (typeof groupsCluster.addGroup === 'function') {
              await groupsCluster.addGroup({ groupId: 0, groupName: 'HomeyGroup' });
              this.log(`[GROUPS] ✅ Endpoint ${ep} joined group 0 (addGroup)`);
            } else if (typeof groupsCluster.add === 'function') {
              await groupsCluster.add({ groupId: 0, groupName: 'HomeyGroup' });
              this.log(`[GROUPS] ✅ Endpoint ${ep} joined group 0 (add)`);
            } else {
              this.log('[GROUPS] ⚠️ No addGroup/add method available (SDK3 limitation)');
            }
          } catch (err) {
            this.log('[GROUPS] Group join failed (may already be member):', err.message);
          }
        }

        // PRIORITY 1: Scenes cluster (Tuya TS0043/TS0044 use this!)
        // v5.5.307: SDK3 FIX - Try multiple cluster access patterns
        const scenesCluster = this.zclNode.endpoints[ep]?.clusters?.scenes
          || this.zclNode.endpoints[ep]?.clusters?.genScenes
          || this.zclNode.endpoints[ep]?.clusters?.[5]
          || this.zclNode.endpoints[ep]?.clusters?.['scenes'];
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

          // v5.5.490: PHYSICAL BUTTON FIX - Multiple scene event patterns
          // With deduplication to prevent multiple triggers from same button press
          if (!this._sceneDedup) this._sceneDedup = {};
          const handleSceneRecall = async (sceneId, source) => {
            const now = Date.now();
            const dedupKey = `${ep}_${sceneId}`;
            const lastTime = this._sceneDedup[dedupKey] || 0;

            // Deduplicate: ignore if same scene on same endpoint within 500ms
            if (now - lastTime < 500) {
              this.log(`[SCENE] ⏭️ Deduplicated ${source} (${now - lastTime}ms since last)`);
              return;
            }
            this._sceneDedup[dedupKey] = now;

            this.log(`[SCENE] 🔘 Button ${ep} scene recall: ${sceneId} (via ${source})`);
            const pressAction = TUYA_PRESS_TYPES[sceneId] || 'single';
            this.log(`🔘 Button ${ep} ${pressAction.toUpperCase()} PRESS (scene ${sceneId})`);
            await this.triggerButtonPress(ep, pressAction);
          };

          // Pattern 1: Generic 'command' event
          scenesCluster.on('command', async (commandName, commandPayload) => {
            this.log(`[SCENE] Button ${ep} command: ${commandName}`, commandPayload);
            if (commandName === 'recall' || commandName === 'recallScene') {
              const sceneId = commandPayload?.sceneId ?? commandPayload?.sceneid ?? commandPayload?.scene ?? commandPayload?.data?.[0] ?? 0;
              await handleSceneRecall(sceneId, 'command');
            }
          });

          // Pattern 2: Direct 'recall' event (SDK3 specific)
          scenesCluster.on('recall', async (payload) => {
            const sceneId = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? payload ?? 0;
            await handleSceneRecall(typeof sceneId === 'number' ? sceneId : 0, 'recall');
          });

          // Pattern 3: Direct 'recallScene' event
          scenesCluster.on('recallScene', async (payload) => {
            const sceneId = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? payload ?? 0;
            await handleSceneRecall(typeof sceneId === 'number' ? sceneId : 0, 'recallScene');
          });

          // Pattern 4: Attribute report for storeScene (some devices)
          scenesCluster.on('attr.currentScene', async (sceneId) => {
            this.log(`[SCENE] attr.currentScene: ${sceneId}`);
            await handleSceneRecall(sceneId, 'attr.currentScene');
          });

          this.log(`[OK] ✅ Button ${ep} scenes detection configured (4 listener patterns)`);
        }

        // PRIORITY 2: OnOff cluster (alternative for some devices)
        // v5.5.307: SDK3 FIX - Try multiple cluster access patterns
        const onOffCluster = this.zclNode.endpoints[ep]?.clusters?.onOff
          || this.zclNode.endpoints[ep]?.clusters?.genOnOff
          || this.zclNode.endpoints[ep]?.clusters?.[6]
          || this.zclNode.endpoints[ep]?.clusters?.['onOff'];
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

          // v5.5.350: CRITICAL FIX for _TZ3000_zgyzgdua and similar buttons
          // These devices use onOff ATTRIBUTE changes for button presses
          // Previous logic blocked first report forever - now only blocks within 5s of init
          let lastOnOffValue = null;
          let lastOnOffTime = 0;
          const initTime = Date.now();

          onOffCluster.on('attr.onOff', async (value) => {
            const now = Date.now();
            const timeSinceLastEvent = now - lastOnOffTime;
            const timeSinceInit = now - initTime;

            this.log(`[ONOFF-ATTR] Button ${ep} onOff: ${value} (last=${lastOnOffValue}, sinceEvent=${timeSinceLastEvent}ms, sinceInit=${timeSinceInit}ms)`);

            // v5.5.350: IGNORE PERIODIC REPORTS
            // If same value AND long time (>5s), it's a periodic status report, NOT a button press
            if (lastOnOffValue !== null && value === lastOnOffValue && timeSinceLastEvent > 5000) {
              this.log(`[ONOFF-ATTR] ⏭️ Ignored: periodic report (same value after ${Math.round(timeSinceLastEvent / 1000)}s)`);
              lastOnOffTime = now;
              return;
            }

            // v5.5.350: FIX - Only ignore VERY FIRST report within 3 seconds of init
            // After 3 seconds, treat ALL attr changes as button presses
            // This fixes _TZ3000_zgyzgdua where button presses ARE onOff attr changes
            if (lastOnOffValue === null && timeSinceInit < 3000) {
              this.log(`[ONOFF-ATTR] ℹ️ Initial state report (within ${timeSinceInit}ms of init) - stored but not triggering`);
              lastOnOffValue = value;
              lastOnOffTime = now;
              return;
            }

            // v5.5.263: Debounce rapid duplicate events (within 100ms)
            if (timeSinceLastEvent < 100 && value === lastOnOffValue) {
              this.log(`[ONOFF-ATTR] ⏭️ Debounced duplicate`);
              return;
            }

            // v5.5.350: Button press detection - ANY change or first report after init window
            const isValueChange = lastOnOffValue === null || value !== lastOnOffValue;
            const isRapidEvent = timeSinceLastEvent < 2000 && timeSinceLastEvent > 100;

            if (isValueChange || isRapidEvent) {
              this.log(`🔘 Button ${ep} PRESSED (onOff=${value}, changed=${isValueChange}, rapid=${isRapidEvent})`);
              await this.triggerButtonPress(ep, 'single');
            } else {
              this.log(`[ONOFF-ATTR] ⏭️ Ignored: not a button press (same value, not rapid)`);
            }

            lastOnOffValue = value;
            lastOnOffTime = now;
          });

          // v5.5.490: PHYSICAL BUTTON FIX - Listen for SPECIFIC command events
          // SDK3 fires BOTH 'command' AND specific 'commandOn'/'commandOff'/'commandToggle' events
          // Many physical buttons ONLY trigger the specific events, not the generic 'command'!
          if (!this._onOffDedup) this._onOffDedup = {};
          const handleDirectCommand = async (cmdName) => {
            const now = Date.now();
            const dedupKey = `${ep}_${cmdName}`;
            const lastTime = this._onOffDedup[dedupKey] || 0;

            // Deduplicate: ignore if same command on same endpoint within 500ms
            if (now - lastTime < 500) {
              this.log(`[ONOFF-DIRECT] ⏭️ Deduplicated ${cmdName} (${now - lastTime}ms)`);
              return;
            }
            this._onOffDedup[dedupKey] = now;

            this.log(`[ONOFF-DIRECT] 🔘 Button ${ep} PHYSICAL PRESS: ${cmdName}`);
            await this.triggerButtonPress(ep, 'single');
          };

          // These listeners catch physical button presses that don't go through generic 'command'
          if (typeof onOffCluster.on === 'function') {
            onOffCluster.on('commandOn', async () => await handleDirectCommand('commandOn'));
            onOffCluster.on('commandOff', async () => await handleDirectCommand('commandOff'));
            onOffCluster.on('commandToggle', async () => await handleDirectCommand('commandToggle'));
            onOffCluster.on('setOn', async () => await handleDirectCommand('setOn'));
            onOffCluster.on('setOff', async () => await handleDirectCommand('setOff'));
            // v5.5.490: Also listen for 'on', 'off', 'toggle' without 'command' prefix
            onOffCluster.on('on', async () => await handleDirectCommand('on'));
            onOffCluster.on('off', async () => await handleDirectCommand('off'));
            onOffCluster.on('toggle', async () => await handleDirectCommand('toggle'));
            this.log(`[ONOFF] ✅ Direct command listeners registered (9 patterns)`);
          }

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
        // v5.5.307: SDK3 FIX - Try multiple cluster access patterns
        const levelCluster = this.zclNode.endpoints[ep]?.clusters?.levelControl
          || this.zclNode.endpoints[ep]?.clusters?.genLevelCtrl
          || this.zclNode.endpoints[ep]?.clusters?.[8];
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
        // v5.5.367: ALWAYS setup Tuya DP listener - some devices use BOTH ZCL and Tuya DP
        // Fixed: Was skipping Tuya DP when scenes/onOff existed, causing "no detection" issues
        const tuyaCluster = this.zclNode.endpoints[ep]?.clusters?.tuya
          || this.zclNode.endpoints[ep]?.clusters?.[0xEF00]
          || this.zclNode.endpoints[ep]?.clusters?.[61184]
          || this.zclNode.endpoints[ep]?.clusters?.manuSpecificTuya;
        if (tuyaCluster) {
          this.log(`[SETUP] Listening to Tuya cluster (0xEF00) on endpoint ${ep}...`);

          // Listen for dataReport commands
          if (typeof tuyaCluster.on === 'function') {
            tuyaCluster.on('dataReport', async (data) => {
              this.log(`[TUYA-DP] Button ${ep} dataReport:`, data);

              // DP1 is often button press type: 0=single, 1=double, 2=long
              const dp = data?.dp ?? data?.datapoint ?? data?.dpId;
              if (dp === 1 || dp === ep) {
                const pressValue = data?.data?.[0] ?? data?.value ?? 0;
                const pressType = TUYA_PRESS_TYPES[pressValue] || 'single';
                this.log(`🔘 Button ${ep} ${pressType.toUpperCase()} PRESS (Tuya DP${dp})`);
                await this.triggerButtonPress(ep, pressType);
              }
            });

            // v5.5.367: Also listen for 'response' event with full data parsing
            tuyaCluster.on('response', async (data) => {
              this.log(`[TUYA-DP] Button ${ep} response:`, data);
              const dp = data?.dp ?? data?.datapoint ?? data?.dpId;
              const value = data?.data?.[0] ?? data?.value ?? data?.raw?.[0] ?? 0;

              // Button DPs: 1-8 for multi-button, or ep number
              if ((dp >= 1 && dp <= 8) || dp === ep) {
                const buttonNum = dp <= 8 ? dp : ep;
                const pressType = TUYA_PRESS_TYPES[value] || 'single';
                this.log(`🔘 Button ${buttonNum} ${pressType.toUpperCase()} PRESS (Tuya response DP${dp})`);
                await this.triggerButtonPress(buttonNum, pressType);
              }
            });

            // v5.5.367: Listen for 'report' event (alternative Tuya implementation)
            tuyaCluster.on('report', async (data) => {
              this.log(`[TUYA-DP] Button ${ep} report:`, data);
              const dp = data?.dp ?? data?.datapoint ?? data?.dpId;
              const value = data?.data?.[0] ?? data?.value ?? 0;
              if (dp >= 1 && dp <= 8) {
                const pressType = TUYA_PRESS_TYPES[value] || 'single';
                await this.triggerButtonPress(dp, pressType);
              }
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
   * v5.5.430: Added global debounce to prevent random/ghost triggers
   */
  async triggerButtonPress(button, type = 'single', count = 1) {
    // v5.5.430: GLOBAL DEBOUNCE - Prevent random ghost triggers
    // Issue: Some buttons (e.g. _TZ3000_5bpeda8u) send spurious events
    const now = Date.now();
    const GLOBAL_DEBOUNCE_MS = 300; // Minimum time between any button events

    if (!this._lastTriggerTime) this._lastTriggerTime = {};
    const lastTime = this._lastTriggerTime[`${button}_${type}`] || 0;

    if (now - lastTime < GLOBAL_DEBOUNCE_MS) {
      this.log(`[FLOW-TRIGGER] ⏭️ DEBOUNCED: Button ${button} ${type} (${now - lastTime}ms since last)`);
      return;
    }
    this._lastTriggerTime[`${button}_${type}`] = now;

    // v5.5.430: Reset button capability to false after trigger (fixes "stays true" issue)
    const buttonCapId = `button.${button}`;
    if (this.hasCapability(buttonCapId)) {
      // Set to true momentarily then back to false
      await this.setCapabilityValue(buttonCapId, true).catch(() => { });
      this.homey.setTimeout(async () => {
        await this.setCapabilityValue(buttonCapId, false).catch(() => { });
      }, 500);
    }

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
              await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
              batteryRead = true;
            } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
              const voltage = data.batteryVoltage / 10;
              // CR2032: 3.0V=100%, 2.0V=0%
              const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
              this.log(`[BUTTON-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
              await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
              batteryRead = true;
            }
          }

          // Try direct attribute access if readAttributes failed
          if (!batteryRead && powerCluster.batteryPercentageRemaining !== undefined) {
            const raw = powerCluster.batteryPercentageRemaining;
            if (raw !== 255 && raw !== 0) {
              const battery = Math.round(raw / 2);
              this.log(`[BUTTON-BATTERY] ✅ Direct attr Battery: ${battery}%`);
              await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
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
        await this.setCapabilityValue('measure_battery', parseFloat(storedBattery)).catch(() => { });
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
      await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
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
