'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const TuyaDPDatabase = require('../../lib/tuya/TuyaDPDatabase');
const { initTuyaDpEngineSafe, logEF00Status } = require('../../lib/tuya/TuyaEF00Base');

/**
 * BSEED Double Socket + USB Device
 *
 * Manufacturer: _TZE204_mvtclclq
 * Product ID: TS0601
 * Type: TS0601 (Pure Tuya DP device)
 *
 * DP Mapping:
 * - DP1: Socket 1 (onoff)
 * - DP2: Socket 2 (onoff.gang2)
 * - DP3: USB Port (onoff.usb)
 */
class BSEEDUSBOutletDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    try {
      this.log('[BSEED-USB] 🔌 Double Socket + USB initializing...');

      // Store zclNode
      this.zclNode = zclNode;

      // v5.2.10: PATCH 1 - Mark as mains-powered (no battery)
      this._mainsPowered = true;

      // Force Tuya DP mode for TS0601
      this.usesTuyaDP = true;
      this.hasTuyaCluster = true;
      this.isTuyaDevice = true;

      // Initialize base first
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));

      // Initialize Tuya DP engine
      await this._initTuyaDpEngine(zclNode);

      // Register capability listeners
      await this._registerCapabilityListeners();

      this.log('[BSEED-USB] ✅ Double Socket + USB initialized');
      await this.setAvailable();

    } catch (err) {
      this.error('[BSEED-USB] ❌ Initialization failed:', err);
    }
  }

  /**
   * Initialize Tuya DP engine
   */
  async _initTuyaDpEngine(zclNode) {
    try {
      this.log('[BSEED-USB] 🔧 Initializing Tuya DP engine...');

      const manager = await initTuyaDpEngineSafe(this, zclNode);

      if (!manager) {
        this.log('[BSEED-USB] ⚠️  EF00 manager not available');
        this._tuyaClusterAvailable = false;
        return;
      }

      this._tuyaClusterAvailable = true;
      logEF00Status(this);

      // DP Mapping for BSEED USB outlet
      this.dpMap = {
        '1': 'socket_1',      // Socket 1 - maps to onoff
        '2': 'socket_2',      // Socket 2 - maps to onoff.gang2
        '3': 'usb_port'       // USB Port - maps to onoff.usb
      };

      this.log('[BSEED-USB] 📊 DP Map:', JSON.stringify(this.dpMap));

      // Register DP listeners
      Object.keys(this.dpMap).forEach(dpId => {
        manager.on(`dp-${dpId}`, (value) => {
          this._onDataPoint(parseInt(dpId), value);
        });
        this.log(`[BSEED-USB] ✅ Listening: dp-${dpId} → ${this.dpMap[dpId]}`);
      });

      // v5.2.10: PATCH 4 - Listen to dpReport for ALL incoming DPs
      manager.on('dpReport', ({ dpId, value, dpType }) => {
        this.log(`[TUYA-DP] usb_outlet_bseed DP report: DP${dpId} = ${JSON.stringify(value)} (type: ${dpType})`);
      });
      this.log('[BSEED-USB] ✅ dpReport listener registered');

      // Auto-setup with TuyaDPMapper
      await TuyaDPMapper.autoSetup(this, zclNode).catch(err => {
        this.log('[BSEED-USB] ⚠️  Auto-mapping failed:', err.message);
      });

      this.log('[BSEED-USB] ✅ Tuya DP engine initialized (mains-powered)');

    } catch (err) {
      this.error('[BSEED-USB] ❌ DP engine init failed:', err);
      this._tuyaClusterAvailable = false;
    }
  }

  /**
   * Handle incoming DP values
   */
  _onDataPoint(dpId, value) {
    const role = this.dpMap[String(dpId)];
    this.log(`[BSEED-USB] DP${dpId} (${role}): ${value}`);

    switch (role) {
      case 'socket_1':
        this.setCapabilityValue('onoff', !!value).catch(this.error);
        break;
      case 'socket_2':
        this.setCapabilityValue('onoff.gang2', !!value).catch(this.error);
        break;
      case 'usb_port':
        this.setCapabilityValue('onoff.usb', !!value).catch(this.error);
        break;
      default:
        this.log(`[BSEED-USB] ⚠️  Unhandled DP${dpId}:`, value);
    }
  }

  /**
   * Register capability listeners for controlling the device
   */
  async _registerCapabilityListeners() {
    // Socket 1 (DP1)
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('[BSEED-USB] 📤 Setting Socket 1:', value);
      return this._sendDP(1, value);
    });

    // Socket 2 (DP2)
    if (this.hasCapability('onoff.gang2')) {
      this.registerCapabilityListener('onoff.gang2', async (value) => {
        this.log('[BSEED-USB] 📤 Setting Socket 2:', value);
        return this._sendDP(2, value);
      });
    }

    // USB Port (DP3)
    if (this.hasCapability('onoff.usb')) {
      this.registerCapabilityListener('onoff.usb', async (value) => {
        this.log('[BSEED-USB] 📤 Setting USB Port:', value);
        return this._sendDP(3, value);
      });
    }
  }

  /**
   * Send a DP command to the device
   */
  async _sendDP(dpId, value) {
    try {
      if (!this.tuyaEF00Manager) {
        throw new Error('Tuya EF00 manager not available');
      }

      await this.tuyaEF00Manager.sendDataPoint(dpId, {
        type: 'bool',
        value: value
      });

      this.log(`[BSEED-USB] ✅ DP${dpId} sent: ${value}`);
      return true;

    } catch (err) {
      this.error(`[BSEED-USB] ❌ Failed to send DP${dpId}:`, err);
      throw err;
    }
  }

  async onDeleted() {
    this.log('[BSEED-USB] Device deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = BSEEDUSBOutletDevice;
