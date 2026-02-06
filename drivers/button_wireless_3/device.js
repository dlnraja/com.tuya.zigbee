'use strict';
const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button3GangDevice - v5.8.39
 *
 * FIX v5.8.39: Complete rewrite of button detection (GitHub #98 DVMasters)
 *   - commandToggle is SINGLE press (was wrongly mapped to long)
 *   - Added raw frame interceptor for E000 (SDK discards unknown cluster frames)
 *   - Added explicit onOff binding on all EPs (EP2-3 had no reporting)
 *   - Removed duplicate attr.onOff listener (base class handles this)
 *
 * STRUCTURE TS0043:
 *   EP1: Button 1 (onOff, powerCfg, E000)
 *   EP2: Button 2 (onOff, powerCfg)
 *   EP3: Button 3 (onOff, powerCfg)
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('[BUTTON3] v5.8.39 initializing...');

    // Set button count BEFORE calling super (base class uses this!)
    this.buttonCount = 3;
    this._zclNode = zclNode;
    this._btnDedup = {};

    const eps = Object.keys(zclNode?.endpoints || {});
    this.log(`[BUTTON3] Endpoints: ${eps.join(', ')}`);

    // Base class handles dynamic capabilities
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT]', err.message));

    // v5.8.39: Comprehensive button detection (GitHub #98)
    await this._setupOnOffCommands(zclNode);
    await this._setupE000BoundCluster(zclNode);
    await this._setupRawFrameInterceptor(zclNode);

    this.log('[BUTTON3] ✅ initialized - OnOff + E000 + Raw interceptor');
  }

  // Deduplication helper for button presses
  async _handleButton(ep, cmd, type) {
    const now = Date.now();
    const key = `${ep}_${cmd}`;
    if (now - (this._btnDedup[key] || 0) < 500) return;
    this._btnDedup[key] = now;
    this.log(`[BUTTON3] 🔘 EP${ep} ${cmd} → Button ${ep} ${type.toUpperCase()}`);
    await this.triggerButtonPress(ep, type);
  }

  /**
   * LAYER 1: onOff command listeners on all 3 endpoints
   * Z2M TS0043: commandToggle = single press per endpoint
   * Also binds onOff cluster so sleepy device sends to Homey
   */
  async _setupOnOffCommands(zclNode) {
    for (let ep = 1; ep <= 3; ep++) {
      const cluster = zclNode?.endpoints?.[ep]?.clusters?.onOff
        || zclNode?.endpoints?.[ep]?.clusters?.genOnOff
        || zclNode?.endpoints?.[ep]?.clusters?.[6];
      if (!cluster) {
        this.log(`[BUTTON3] ⚠️ EP${ep} no onOff cluster`);
        continue;
      }

      // Bind so device sends events to Homey coordinator
      if (typeof cluster.bind === 'function') {
        try {
          await cluster.bind();
          this.log(`[BUTTON3] ✅ OnOff bound EP${ep}`);
        } catch (err) {
          this.log(`[BUTTON3] ℹ️ Bind EP${ep}: ${err.message}`);
        }
      }

      if (typeof cluster.on !== 'function') continue;

      // CRITICAL: commandToggle = single (Z2M research), NOT long
      cluster.on('commandToggle', () => this._handleButton(ep, 'toggle', 'single'));
      cluster.on('commandOn', () => this._handleButton(ep, 'on', 'single'));
      cluster.on('commandOff', () => this._handleButton(ep, 'off', 'double'));

      // Generic command fallback
      cluster.on('command', (cmdName) => {
        const map = { on: 'single', setOn: 'single', off: 'double', setOff: 'double', toggle: 'single' };
        if (map[cmdName]) this._handleButton(ep, `cmd_${cmdName}`, map[cmdName]);
      });

      this.log(`[BUTTON3] ✅ EP${ep} onOff listeners ready`);
    }
  }

  /**
   * LAYER 2: E000 BoundCluster for MOES-style button data
   * Cluster 57344 (0xE000) carries button+pressType in frame payload
   */
  async _setupE000BoundCluster(zclNode) {
    let TuyaE000BoundCluster;
    try {
      TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
    } catch (e) {
      this.log('[BUTTON3-E000] ℹ️ TuyaE000BoundCluster not available');
      return;
    }

    for (let ep = 1; ep <= 3; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;

      const boundCluster = new TuyaE000BoundCluster({
        device: this,
        onButtonPress: async (button, pressType) => {
          const btn = (button >= 1 && button <= 3) ? button : ep;
          this.log(`[BUTTON3-E000] 🔘 Button ${btn} ${pressType.toUpperCase()} (EP${ep})`);
          await this.triggerButtonPress(btn, pressType);
        }
      });

      boundCluster.endpoint = ep;
      if (!endpoint.bindings) endpoint.bindings = {};
      endpoint.bindings[57344] = boundCluster;
      this.log(`[BUTTON3-E000] ✅ BoundCluster EP${ep}`);
    }
  }

  /**
   * LAYER 3: Raw frame interceptor
   * Homey SDK discards frames for unknown clusters like 57344.
   * Hook zclNode.handleFrame to catch them before they are dropped.
   */
  async _setupRawFrameInterceptor(zclNode) {
    try {
      // Hook zclNode-level handleFrame (catches ALL incoming frames)
      if (zclNode && typeof zclNode.handleFrame === 'function') {
        const origNodeHandle = zclNode.handleFrame.bind(zclNode);
        zclNode.handleFrame = async (endpointId, clusterId, frame, meta) => {
          if (clusterId === 57344 || clusterId === 0xE000) {
            this.log(`[BUTTON3-RAW] EP${endpointId} cluster 57344 intercepted`);
            this._parseRawE000Frame(endpointId, frame);
          }
          return origNodeHandle(endpointId, clusterId, frame, meta);
        };
        this.log('[BUTTON3-RAW] ✅ zclNode.handleFrame hooked');
      }

      // Hook per-endpoint handleFrame as additional safety net
      for (let ep = 1; ep <= 3; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint || typeof endpoint.handleFrame !== 'function') continue;

        const origEpHandle = endpoint.handleFrame.bind(endpoint);
        endpoint.handleFrame = async (clusterId, frame, meta) => {
          if (clusterId === 57344 || clusterId === 0xE000) {
            this.log(`[BUTTON3-RAW] EP${ep} endpoint-level intercept`);
            this._parseRawE000Frame(ep, frame);
          }
          return origEpHandle(clusterId, frame, meta);
        };
      }

      this.log('[BUTTON3-RAW] ✅ Frame interceptors ready');
    } catch (err) {
      this.log(`[BUTTON3-RAW] ⚠️ Setup error: ${err.message}`);
    }
  }

  /**
   * Parse raw E000 frame into button press
   * Multiple strategies: cmdId-as-button, data[0]/data[1], single-byte, fallback
   */
  _parseRawE000Frame(ep, frame) {
    try {
      const cmdId = frame?.cmdId ?? frame?.commandId;
      const data = frame?.data;
      const pressMap = { 0: 'single', 1: 'double', 2: 'long' };

      this.log(`[BUTTON3-RAW] Parsing: cmdId=${cmdId}, data=${data?.toString?.('hex') || 'none'}`);

      // Strategy 1: cmdId is button number (1-3), data[0] is press type
      if (cmdId >= 1 && cmdId <= 3) {
        const pressType = pressMap[data?.[0]] || 'single';
        this.log(`[BUTTON3-RAW] 🔘 Button ${cmdId} ${pressType} (cmdId strategy)`);
        this.triggerButtonPress(cmdId, pressType);
        return;
      }

      // Strategy 2: data[0] = button, data[1] = press type
      if (data && data.length >= 2 && data[0] >= 1 && data[0] <= 3) {
        const pressType = pressMap[data[1]] || 'single';
        this.log(`[BUTTON3-RAW] 🔘 Button ${data[0]} ${pressType} (data strategy)`);
        this.triggerButtonPress(data[0], pressType);
        return;
      }

      // Strategy 3: Single byte = press type, use endpoint as button
      if (data && data.length === 1) {
        const pressType = pressMap[data[0]] || 'single';
        this.log(`[BUTTON3-RAW] 🔘 Button ${ep} ${pressType} (single-byte strategy)`);
        this.triggerButtonPress(ep, pressType);
        return;
      }

      // Fallback: endpoint as button, single press
      this.log(`[BUTTON3-RAW] 🔘 Button ${ep} single (fallback)`);
      this.triggerButtonPress(ep, 'single');
    } catch (err) {
      this.log(`[BUTTON3-RAW] ⚠️ Parse error: ${err.message}`);
    }
  }

  async onDeleted() {
    this.log('Button3GangDevice deleted');
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button3GangDevice;
