'use strict';

/**
 * IAS ALARM FALLBACK - v5.5.796 (Forum #1159 Lasse_K ZG-222Z fix)
 * Handles devices where IAS Zone bind is unsupported (INVALID_EP)
 * Fallback strategies: polling, Tuya DP mirror, attribute read
 * 
 * v5.5.796: FORUM FIX - Enhanced for Hobeian ZG-222Z water sensor
 * - Added immediate status read on init
 * - Added raw frame monitoring
 * - Enhanced wake detection with multiple triggers
 * - Added force read after CIE write
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
    this.device.log('[IAS-FALLBACK] v5.5.796: Initializing enhanced fallback (Lasse_K fix)...');
    
    // v5.5.796: Setup wake detection FIRST (before bind attempt)
    this._setupWakeDetection();
    
    // Try bind first
    const bindOk = await this._tryBind();
    if (bindOk) {
      this.device.log('[IAS-FALLBACK] Bind OK, fallback active as backup');
      // v5.5.796: Even if bind works, still do initial read
      await this._forceInitialRead();
      return;
    }
    
    // Setup fallback
    this.device.log('[IAS-FALLBACK] Bind failed (INVALID_EP), enabling fallback...');
    
    if (this.useTuyaMirror) {
      this._setupTuyaMirror();
    }
    
    // v5.5.796: Force initial status read
    await this._forceInitialRead();
    
    this._startPolling();
    this.device.log('[IAS-FALLBACK] Ready with wake detection and force read');
  }

  /**
   * v5.5.796: Force initial status read (Lasse_K forum fix)
   * Some ZG-222Z sensors need immediate read after init
   */
  async _forceInitialRead() {
    try {
      this.device.log('[IAS-FALLBACK] 📖 Forcing initial status read...');
      
      const ep = this.device.zclNode?.endpoints?.[1];
      const ias = ep?.clusters?.iasZone || ep?.clusters?.ssIasZone || ep?.clusters?.[0x0500];
      
      if (ias?.readAttributes) {
        // Try multiple read attempts (sleepy device may need retry)
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const attrs = await Promise.race([
              ias.readAttributes(['zoneStatus', 'zoneState', 'zoneType']),
              new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
            ]);
            
            this.device.log(`[IAS-FALLBACK] 📖 Initial read attempt ${attempt}:`, attrs);
            
            if (attrs?.zoneStatus !== undefined) {
              this._handleZoneStatus(attrs.zoneStatus);
              this.device.log('[IAS-FALLBACK] ✅ Initial status read success');
              return;
            }
          } catch (e) {
            this.device.log(`[IAS-FALLBACK] ⚠️ Initial read attempt ${attempt} failed: ${e.message}`);
          }
          
          // Wait before retry
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    } catch (e) {
      this.device.log(`[IAS-FALLBACK] ⚠️ Force initial read failed: ${e.message}`);
    }
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
   * v5.5.796: Handle zone status with alarm bit detection (Lasse_K forum fix)
   * Enhanced with detailed bit parsing for ZG-222Z
   */
  _handleZoneStatus(status) {
    // IAS Zone Status bits:
    // Bit 0: Alarm1 (primary alarm)
    // Bit 1: Alarm2 (secondary alarm) - ZG-222Z uses this!
    // Bit 2: Tamper
    // Bit 3: Battery low
    // Bit 4: Supervision reports
    // Bit 5: Restore reports
    // Bit 6: Trouble
    // Bit 7: AC mains
    
    const alarm1 = (status & 0x01) > 0;
    const alarm2 = (status & 0x02) > 0;
    const tamper = (status & 0x04) > 0;
    const batteryLow = (status & 0x08) > 0;
    
    // v5.5.796: FORUM FIX - Check BOTH alarm bits (ZG-222Z uses alarm2)
    const alarm = alarm1 || alarm2;
    
    this.device.log(`[IAS-FALLBACK] 📊 Zone status: 0x${status.toString(16)} (${status})`);
    this.device.log(`[IAS-FALLBACK]    → Alarm1: ${alarm1}, Alarm2: ${alarm2}, Tamper: ${tamper}, BattLow: ${batteryLow}`);
    this.device.log(`[IAS-FALLBACK]    → Combined alarm: ${alarm}`);
    
    this._updateAlarm(alarm);
    
    // v5.5.796: Also update tamper if device supports it
    if (this.device.hasCapability('alarm_tamper')) {
      this.device.setCapabilityValue('alarm_tamper', tamper).catch(() => {});
    }
    
    // v5.5.796: Store raw status for debugging
    this.lastStatus = status;
    this.lastStatusTime = Date.now();
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
