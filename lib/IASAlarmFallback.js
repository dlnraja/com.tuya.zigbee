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
    // v5.5.774: Enhanced wake detection for sleepy devices
    this.wakeDetected = false;
    this.lastWakeTime = 0;
  }

  async init() {
    this.device.log('[IAS-FALLBACK] v5.5.774: Initializing enhanced fallback...');
    
    // Try bind first
    const bindOk = await this._tryBind();
    if (bindOk) {
      this.device.log('[IAS-FALLBACK] Bind OK, no fallback needed');
      return;
    }
    
    // Setup fallback
    this.device.log('[IAS-FALLBACK] Bind failed (INVALID_EP), enabling fallback...');
    
    if (this.useTuyaMirror) {
      this._setupTuyaMirror();
    }
    
    // v5.5.774: Setup wake detection listener
    this._setupWakeDetection();
    
    this._startPolling();
    this.device.log('[IAS-FALLBACK] Ready with wake detection');
  }
  
  /**
   * v5.5.774: FORUM FIX - Lasse_K ZG-222Z water sensor
   * Detect when sleepy device wakes up and immediately read status
   * GitHub #28181: INVALID_EP devices need wake-triggered reads
   */
  _setupWakeDetection() {
    try {
      // Listen for ANY incoming message as wake indicator
      const ep = this.device.zclNode?.endpoints?.[1];
      if (!ep) return;
      
      // Monitor basic cluster for heartbeat/wake
      const basic = ep.clusters?.basic || ep.clusters?.genBasic || ep.clusters?.[0];
      if (basic && typeof basic.on === 'function') {
        basic.on('attr', () => {
          this._onDeviceWake('basic_attr');
        });
      }
      
      // Monitor IAS Zone for any activity
      const ias = ep.clusters?.iasZone || ep.clusters?.ssIasZone || ep.clusters?.[0x0500];
      if (ias && typeof ias.on === 'function') {
        ias.on('attr', (attrs) => {
          this._onDeviceWake('ias_attr');
          // Direct status update if available
          if (attrs?.zoneStatus !== undefined) {
            this._handleZoneStatus(attrs.zoneStatus);
          }
        });
        ias.on('zoneStatusChangeNotification', (data) => {
          this._onDeviceWake('ias_notification');
          const status = data?.zoneStatus ?? data?.payload?.zoneStatus ?? data;
          if (typeof status === 'number') {
            this._handleZoneStatus(status);
          }
        });
      }
      
      this.device.log('[IAS-FALLBACK] ✅ Wake detection listeners active');
    } catch (e) {
      this.device.log(`[IAS-FALLBACK] ⚠️ Wake detection setup failed: ${e.message}`);
    }
  }
  
  /**
   * v5.5.774: Handle device wake event
   */
  async _onDeviceWake(source) {
    const now = Date.now();
    // Debounce: max once per 5 seconds
    if (now - this.lastWakeTime < 5000) return;
    this.lastWakeTime = now;
    
    this.device.log(`[IAS-FALLBACK] 📡 Device wake detected (${source})`);
    this.wakeDetected = true;
    
    // Immediately try to read status while device is awake
    await this._poll();
  }
  
  /**
   * v5.5.774: Handle zone status with alarm bit detection
   */
  _handleZoneStatus(status) {
    const alarm1 = (status & 0x01) > 0;
    const alarm2 = (status & 0x02) > 0;
    const alarm = alarm1 || alarm2; // Water sensors may use either bit
    
    this.device.log(`[IAS-FALLBACK] Zone status: ${status} → alarm1=${alarm1}, alarm2=${alarm2}`);
    this._updateAlarm(alarm);
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
    // Priority order based on driver type
    const driverId = this.device.driver?.id || '';
    let caps = ['alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke'];
    
    // Prioritize based on driver
    if (driverId.includes('water')) caps = ['alarm_water', ...caps];
    if (driverId.includes('smoke')) caps = ['alarm_smoke', ...caps];
    if (driverId.includes('contact')) caps = ['alarm_contact', ...caps];
    if (driverId.includes('motion')) caps = ['alarm_motion', ...caps];
    
    for (const cap of caps) {
      if (this.device.hasCapability(cap)) {
        this.device.setCapabilityValue(cap, value).catch(() => {});
        this.device.log?.(`[IAS-FALLBACK] ${cap} = ${value}`);
        break;
      }
    }
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

module.exports = IASAlarmFallback;
