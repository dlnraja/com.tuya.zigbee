'use strict';

/**
 * IAS ALARM FALLBACK - v5.5.670
 * Handles devices where IAS Zone bind is unsupported (INVALID_EP)
 * Fallback strategies: polling, Tuya DP mirror, attribute read
 */

class IASAlarmFallback {
  constructor(device, options = {}) {
    this.device = device;
    this.pollInterval = options.pollInterval || 60000;
    this.useTuyaMirror = options.useTuyaMirror !== false;
    this.timer = null;
    this.lastStatus = null;
  }

  async init() {
    this.device.log('[IAS-FALLBACK] Initializing...');
    
    // Try bind first
    const bindOk = await this._tryBind();
    if (bindOk) {
      this.device.log('[IAS-FALLBACK] Bind OK, no fallback needed');
      return;
    }
    
    // Setup fallback
    this.device.log('[IAS-FALLBACK] Bind failed, enabling fallback...');
    
    if (this.useTuyaMirror) {
      this._setupTuyaMirror();
    }
    
    this._startPolling();
    this.device.log('[IAS-FALLBACK] Ready');
  }

  async _tryBind() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      const ias = ep?.clusters?.iasZone || ep?.clusters?.[0x0500];
      if (!ias?.bind) return false;
      await ias.bind();
      return true;
    } catch (e) {
      if (e.message?.includes('INVALID_EP')) {
        this.device.log('[IAS-FALLBACK] INVALID_EP detected');
      }
      return false;
    }
  }

  _setupTuyaMirror() {
    // Listen for Tuya DP that mirrors IAS status
    const dpHandler = this.device._handleDP?.bind(this.device);
    if (dpHandler) {
      const origHandler = this.device._handleDP;
      this.device._handleDP = (dp, value) => {
        // DP 101/102 often mirror IAS alarm status
        if ([101, 102, 1].includes(dp) && typeof value === 'boolean') {
          this._updateAlarm(value);
        }
        return origHandler.call(this.device, dp, value);
      };
    }
  }

  _startPolling() {
    this.timer = setInterval(() => this._poll(), this.pollInterval);
    this._poll();
  }

  async _poll() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      const ias = ep?.clusters?.iasZone || ep?.clusters?.[0x0500];
      if (!ias?.readAttributes) return;
      
      const attrs = await ias.readAttributes(['zoneStatus']);
      if (attrs?.zoneStatus !== undefined && attrs.zoneStatus !== this.lastStatus) {
        this.lastStatus = attrs.zoneStatus;
        const alarm = (attrs.zoneStatus & 0x03) > 0;
        this._updateAlarm(alarm);
      }
    } catch (e) { /* silent */ }
  }

  _updateAlarm(value) {
    const caps = ['alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke'];
    for (const cap of caps) {
      if (this.device.hasCapability(cap)) {
        this.device.setCapabilityValue(cap, value).catch(() => {});
        break;
      }
    }
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

module.exports = IASAlarmFallback;
