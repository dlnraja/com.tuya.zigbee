'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

let UnifiedBatteryHandler = null;
try {
  UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
} catch (e) {
  // UnifiedBatteryHandler not available - will use fallback
}

let IEEEAddressManager = null;
try {
  IEEEAddressManager = require('../../lib/managers/IEEEAddressManager');
} catch (e) {
  // IEEEAddressManager not available - will use fallback
}

let IasAceBoundCluster = null;
try {
  const iasAce = require('../../lib/clusters/IasAceCluster');
  IasAceBoundCluster = iasAce.IasAceBoundCluster;
} catch (e) {
  // IasAceCluster not available - will use fallback
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SOS EMERGENCY BUTTON - v5.5.804 UNIVERSAL ARCHITECTURE                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports: IAS ACE, IAS Zone, Tuya DP, and genOnOff                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SosEmergencyButtonDevice extends TuyaZigbeeDevice {

  /**
   * v10.3.0 FIX (B11): This class owns battery handling (_setupBattery,
   * _updateBattery with UnifiedBatteryHandler normalization). BatteryRouter
   * must not act as a third writer.
   */
  get _ownsBatteryHandling() { return true; }

  /**
   * v10.3.0 FIX (B7): No-op override so VirtualButtonMixin.initVirtualButtons
   * (which checks for a "dedicated button capability router") does NOT
   * register its asymmetric button.1 listener. This driver's own
   * _registerButtonListener is the single button.1 listener — a second one
   * would double-trigger the alarm.
   */
  _registerButtonCapabilityListeners() { /* intentionally empty — see _registerButtonListener */ }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });

      this.log('╔══════════════════════════════════════════════════════════════╗');
      this.log('║     SOS EMERGENCY BUTTON v5.5.804 - RESTORED                 ║');
      this.log('╚══════════════════════════════════════════════════════════════╝');

      this.zclNode = zclNode;

      // 1. Initialize State
      this._lastTrigger = 0;
      this._enrollmentPending = false;
      this._batteryReportingConfigured = false;
      this._batteryBindComplete = false;

      // 2. Ensure Capabilities
      await this._ensureCapabilities();

      // 3. Setup Listeners
      this._registerButtonListener();
      await this._setupIasAce();
      await this._setupIasZone();
      await this._setupTuyaDP();
      await this._setupAlternativeClusters();
      await this._setupGlobalListeners();
      await this._setupBattery();

      // 4. Heartbeat & Maintenance
      this._setupHeartbeatMonitor();
      await this._checkClustersAndWarn();

      this.log('[SOS] ✅ Device ready');
    }, 'onNodeInit');
  }

  async _ensureCapabilities() {
    const caps = ['alarm_generic', 'measure_battery', 'alarm_battery'];
    for (const cap of caps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
    await this.safeSetCapabilityValue('alarm_generic', false).catch(() => { });
  }

  /**
   * v9.0.365: Capability listener for button.1 (virtual press from the app UI).
   * Without it Homey logs "Missing Capability Listener: button.1" and the
   * button tile does nothing. This driver extends TuyaZigbeeDevice, not
   * ButtonDevice, so the base-class registration never ran.
   */
  _registerButtonListener() {
    if (!this.hasCapability('button.1') || this._buttonListenerRegistered) {return;}
    this._buttonListenerRegistered = true;
    try {
      this.registerCapabilityListener('button.1', async () => {
        this.log('[SOS] Virtual button press (app UI)');
        await this._handleAlarm({ source: 'virtual-button' });
      });
      this.log('[SOS] ✅ button.1 capability listener registered');
    } catch (e) {
      this.log('[SOS] button.1 listener registration failed:', e.message);
    }
  }

  /**
   * Setup IAS ACE (Cluster 0x0501) - Common for TS0215A
   */
  async _setupIasAce() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) {return;}

    // Method 1: Bound Cluster (receives commands from device)
    if (IasAceBoundCluster && typeof ep1.bind === 'function') {
      try {
        const boundCluster = new IasAceBoundCluster({
          onEmergency: () => this._handleAlarm({ source: 'iasAce-bound-emergency' }),
          onFire: () => this._handleAlarm({ source: 'iasAce-bound-fire' }),
          onPanic: () => this._handleAlarm({ source: 'iasAce-bound-panic' })
        });
        ep1.bind('iasAce', boundCluster);
        this.log('[SOS] ✅ IasAceBoundCluster bound');
      } catch (e) {
        this.error('[SOS] IasAceBoundCluster bind failed:', e.message);
      }
    }

    // Method 2: Explicit cluster listeners
    const iasAce = ep1.clusters?.iasAce || ep1.clusters?.ssIasAce;
    if (iasAce && typeof iasAce.on === 'function') {
      iasAce.on('command', (cmd, payload) => {
        this.log('[SOS] IAS ACE command:', cmd, payload);
        const cmdLower = (cmd || '').toString().toLowerCase();
        if (['emergency', 'panic', 'fire', 'sos', '02', '03', '04'].includes(cmdLower)) {
          this._handleAlarm({ source: 'iasAce-command', command: cmd });
        }
      });
    }
  }

  /**
   * Setup IAS Zone (Cluster 0x0500)
   */
  async _setupIasZone() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const iasZone = ep1?.clusters?.iasZone;
    if (!iasZone) {return;}

    // Align with IASZoneManager / Homey "Peter pattern": zoneId 10 + proactive
    // enroll response. zoneId 0 left SOS buttons stuck at "Laatste waarde onbekend"
    // with battery "?" (forum #2134).
    const sendEnrollResponse = async (why) => {
      try {
        await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
        this.log(`[SOS] ✅ Enroll Response sent (${why}, zoneId: 10)`);
        this._enrollmentPending = false;
      } catch (e) {
        this.error('[SOS] Enroll response failed:', e.message);
      }
    };

    // Listener BEFORE proactive response (must be sync-assign, no await gap)
    iasZone.onZoneEnrollRequest = () => {
      this.log('[SOS] Zone Enroll Request received');
      sendEnrollResponse('request');
    };
    if (typeof iasZone.on === 'function') {
      iasZone.on('zoneEnrollRequest', () => sendEnrollResponse('event'));
    }

    // CIE Address Setup
    try {
      const ieeeAddress = await this._getCoordinatorIeee();
      if (ieeeAddress) {
        const attrs = await iasZone.readAttributes(['zoneState']).catch(() => null);
        if (!attrs || attrs.zoneState === 0 || attrs.zoneState === 'notEnrolled') {
          await iasZone.writeAttributes({ iasCIEAddress: ieeeAddress }).catch(() => { });
          this.log('[SOS] ✅ Wrote iasCIEAddress to trigger enrollment');
        } else {
          this.log(`[SOS] ℹ️ Already enrolled (zoneState: ${attrs.zoneState})`);
        }
      }
    } catch (e) {
      this.error('[SOS] CIE Address setup failed:', e.message);
    }

    // Proactive enrollment (SDK best practice — do not wait for request)
    await sendEnrollResponse('proactive');

    // Alarm Listeners
    iasZone.onZoneStatusChangeNotification = (payload) => this._handleAlarm(payload);
    
    if (typeof iasZone.on === 'function') {
      iasZone.on('attr.zoneStatus', (status) => this._handleAlarm({ zoneStatus: status }));
      iasZone.on('command', (cmd, payload) => {
        this.log('[SOS] IAS Zone command:', cmd, payload);
        this._handleAlarm({ source: 'iasZone-command', command: cmd, ...payload });
      });
    }
  }

  /**
   * Setup Tuya DP (Cluster 0xEF00)
   */
  async _setupTuyaDP() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const tuya = ep1?.clusters?.tuya || ep1?.clusters?.manuSpecificTuya || ep1?.clusters?.['0xEF00'];
    if (!tuya || typeof tuya.on !== 'function') {return;}

    tuya.on('datapoint', (dp, value) => {
      this.log(`[SOS] Tuya DP${dp} received:`, value);
      this._handleTuyaDP(dp, value);
    });

    tuya.on('reporting', (frame) => {
      if (frame?.data?.dp !== undefined) {
        this._handleTuyaDP(frame.data.dp, frame.data.value);
      }
    });
  }

  async _handleTuyaDP(dp, value) {
    if (this._destroyed) {return;}
    // Battery DPs
    if (dp === 4 || dp === 15 || (dp === 101 && typeof value === 'number')) {
      // v9.0.365: route through the smart normalizer (0-200 / 0-50 curated
      // scales, mV-as-percentage quirk, sentinels) — the previous raw clamp
      // misread every non-0-100 scale.
      const raw = parseInt(value, 10);
      const battery = UnifiedBatteryHandler?.normalizeZigbeeValue
        ? UnifiedBatteryHandler.normalizeZigbeeValue(raw, {
            manufacturer: this.getSetting('zb_manufacturer_name') || '',
            batteryType: 'CR2032',
          })
        : Math.min(100, Math.max(0, raw));
      if (battery !== null && battery !== undefined && !isNaN(battery)) {
        await this.safeSetCapabilityValue('measure_battery', battery).catch(() => { });
        this._updateActivity();
      }
      return;
    }

    // SOS DPs (DP1, DP14, DP101 boolean)
    if (dp === 1 || dp === 14 || (dp === 101 && typeof value !== 'number')) {
      // Tuya DP might send 1, true, 'true', or even 0/false depending on button release/press
      // For SOS buttons, any payload on these DPs usually means a press event
      this._handleAlarm({ source: 'tuya-dp', dp, value });
    }

    // Button Actions (DP13)
    if (dp === 13) {
      this._handleAlarm({ source: 'tuya-dp13', value });
    }
  }

  /**
   * Alternative clusters (OnOff, Scenes, Multistate)
   */
  async _setupAlternativeClusters() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) {return;}

    // genOnOff
    const onOff = ep1.clusters?.onOff || ep1.clusters?.genOnOff;
    if (onOff && typeof onOff.on === 'function') {
      onOff.on('command', (cmd) => this._handleAlarm({ source: 'onOff', command: cmd }));
    }

    // multistateInput
    const ms = ep1.clusters?.multistateInput || ep1.clusters?.genMultistateInput;
    if (ms && typeof ms.on === 'function') {
      ms.on('attr.presentValue', (v) => this._handleAlarm({ source: 'multistate', value: v }));
    }
  }

  /**
   * Global Listeners to catch anything missed
   */
  async _setupGlobalListeners() {
    if (!this.zclNode?.endpoints) {return;}

    for (const [epId, ep] of Object.entries(this.zclNode.endpoints)) {
      if (!ep?.clusters) {continue;}
      for (const [clusterName, cluster] of Object.entries(ep.clusters)) {
        if (typeof cluster.on !== 'function') {continue;}

        cluster.on('attr', (name, value) => {
          const alarmClusters = ['iaszone', 'iasace', '1280', '1281'];
          if (alarmClusters.some(c => clusterName.toLowerCase().includes(c))) {
            this._handleAlarm({ source: 'global-attr', cluster: clusterName, attr: name, value });
          }
        });

        cluster.on('command', (cmd, payload) => {
          const alarmClusters = ['iaszone', 'iasace', '1280', '1281'];
          if (alarmClusters.some(c => clusterName.toLowerCase().includes(c))) {
            this._handleAlarm({ source: 'global-cmd', cluster: clusterName, command: cmd, ...payload });
          }
        });
      }
    }
  }

  /**
   * Alarm Handling
   */
  async _handleAlarm(payload) {
    if (this._destroyed) {return;}
    this._updateActivity();

    // Gate on alarm bits for zoneStatus reports — clear/keep-alive must NOT
    // fire SOS (or re-write CIE). ACE / DP / announce / command sources pass.
    const src = payload && payload.source ? String(payload.source) : '';
    const allowWithoutAlarmBit = /ace|dp|device_announce|command|tuya|virtual/i.test(src);
    if (!allowWithoutAlarmBit) {
      const zs = payload?.zoneStatus !== undefined ? payload.zoneStatus : payload;
      let alarm = false;
      if (zs && typeof zs === 'object') {
        alarm = !!(zs.alarm1 || zs.alarm2
          || (typeof zs.get === 'function' && (zs.get('alarm1') || zs.get('alarm2'))));
      } else if (typeof zs === 'number' && Number.isFinite(zs)) {
        alarm = (zs & 0x03) !== 0;
      }
      if (!alarm) {
        this.log('[SOS] Ignoring non-alarm zoneStatus (clear/keep-alive)');
        return;
      }
    }

    const now = Date.now();
    if (now - this._lastTrigger < 2000) {return;}
    this._lastTrigger = now;

    this.log('[SOS] SOS BUTTON PRESSED!', JSON.stringify(payload));

    // Wake up actions — battery yes; CIE only if we have a real IEEE
    this._readBatteryNow().catch(() => {});
    this._verifyCieAddress().catch(() => {});

    // Set capability and trigger flow with source info
    await this.safeSetCapabilityValue('alarm_generic', true).catch(() => { });
    if (this.driver?.triggerSOS) {
      const source = (payload && payload.source) || 'unknown';
      await this.driver.triggerSOS(this, { source });
    }

    // v10.3.0 FIX (B6): Physical presses must fire the same flow sets as a
    // virtual UI press — pulse button.1 and fire the generic button_pressed
    // card (the SOS-specific card above stays the primary signal).
    if (this.hasCapability('button.1')) {
      await this.safeSetCapabilityValue('button.1', true).catch(() => { });
      (this.homey && typeof this.homey.setTimeout === 'function' ? this.homey : globalThis).setTimeout(async () => {
        if (this._destroyed) {return;}
        await this.safeSetCapabilityValue('button.1', false).catch(() => { });
      }, 500);
    }
    try {
      await this.homey.flow.getDeviceTriggerCard('button_pressed')
        .trigger(this, { button: '1', type: 'single' }, {})
        .catch(() => { });
    } catch (_e) { /* generic card not available for this driver */ }

    // Auto-reset
    if (this._resetTimeout) {this.homey.clearTimeout(this._resetTimeout);}
    this._resetTimeout = (this.homey && typeof this.homey.setTimeout === 'function' ? this.homey : globalThis).setTimeout(async () => {
      if (this._destroyed) {return;}
      await this.safeSetCapabilityValue('alarm_generic', false).catch(() => { });
      this.log('[SOS] alarm_generic reset');
    }, 5000);
  }

  /**
   * Battery Setup & Management
   */
  async _setupBattery() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;
    if (!powerCfg || typeof powerCfg.on !== 'function') {return;}

    powerCfg.on('attr.batteryPercentageRemaining', (v) => this._updateBattery(v, 'percentage'));
    powerCfg.on('attr.batteryVoltage', (v) => this._updateBattery(v, 'voltage'));
    powerCfg.on('report', (attrs) => {
      if (attrs.batteryPercentageRemaining !== undefined) {this._updateBattery(attrs.batteryPercentageRemaining, 'percentage');}
      if (attrs.batteryVoltage !== undefined) {this._updateBattery(attrs.batteryVoltage, 'voltage');}
    });

    // Forum #2134 (Peter): SOS tiles showed battery "?" / "Laatste waarde onbekend"
    // because listeners alone never populate measure_battery until a press wake.
    // Force an immediate read + sleepy retry, and request reporting when supported.
    await this._readBatteryNow().catch(() => {});
    try {
      if (typeof powerCfg.configureReporting === 'function') {
        await powerCfg.configureReporting([{
          attribute: 'batteryPercentageRemaining',
          minimumReportInterval: 3600,
          maximumReportInterval: 21600,
          reportableChange: 2,
        }]).catch(() => {});
      }
    } catch (_e) { /* optional */ }

    const timerApi = (this.homey && typeof this.homey.setTimeout === 'function') ? this.homey : globalThis;
    this._batteryRetryTimer = timerApi.setTimeout(() => {
      this._batteryRetryTimer = null;
      if (this._destroyed) {return;}
      this._readBatteryNow().catch(() => {});
    }, 8000);
  }

  async _updateBattery(value, type) {
    if (this._destroyed) {return;}
    if (value === undefined || value === null || value === 255) {return;}

    let percent;
    if (type === 'percentage') {
      // v9.0.365: smart normalization instead of the ">100 ? /2 : as-is"
      // rule (misread 0-50 scales and ZCL 0-200 values ≤ 100).
      percent = UnifiedBatteryHandler?.normalizeZigbeeValue
        ? UnifiedBatteryHandler.normalizeZigbeeValue(value, {
            manufacturer: this.getSetting('zb_manufacturer_name') || '',
            batteryType: 'CR2032',
          })
        : (value > 100 ? Math.round(value / 2) : value);
      if (percent === null || percent === undefined) {return;}
    } else {
      // ZCL batteryVoltage is in 100mV units (30 = 3.0V); tolerate mV (3000)
      // and plain volts (3.0) too — the previous code read 3.0V as "30V".
      let voltage = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(voltage)) {return;}
      if (voltage > 300) {voltage = voltage / 1000;}      // mV
      else if (voltage >= 10) {voltage = voltage / 10;}   // ZCL 100mV units
      percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, '3V_2100');
    }

    if (percent >= 0 && percent <= 100) {
      await this.safeSetCapabilityValue('measure_battery', percent).catch(() => { });
      this._updateActivity();

      // v5.5.833: Trigger battery_low flow when below threshold
      const threshold = this.getSetting('battery_low_threshold') || 20;
      if (percent <= threshold) {
        await this.safeSetCapabilityValue('alarm_battery', true).catch(() => { });
        if (this.driver?.triggerBatteryLow) {
          await this.driver.triggerBatteryLow(this, { battery_level: percent });
        }
      } else {
        await this.safeSetCapabilityValue('alarm_battery', false).catch(() => { });
      }
    }
  }

  async _readBatteryNow() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;
    if (!powerCfg?.readAttributes) {return;}

    try {
      const result = await Promise.race([
        powerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
        new Promise((_, r) => (this.homey && typeof this.homey.setTimeout === 'function' ? this.homey : globalThis).setTimeout(() => { if (this._destroyed) {return;} r(new Error('Timeout')); }, 1500))
      ]).catch(() => ({}));

      if (result.batteryPercentageRemaining !== undefined) {this._updateBattery(result.batteryPercentageRemaining, 'percentage');}
      else if (result.batteryVoltage !== undefined) {this._updateBattery(result.batteryVoltage, 'voltage');}
    } catch (e) {
      this.error('[SOS] Battery read failed:', e.message);
    }
  }

  /**
   * Heartbeat & Maintenance
   */
  _setupHeartbeatMonitor() {
    this._lastActivity = Date.now();
    this._heartbeatInterval = (this.homey && typeof this.homey.setInterval === 'function' ? this.homey : globalThis).setInterval(() => {
      if (this._destroyed) {return;}
      const hours = (Date.now() - this._lastActivity) / (1000 * 60 * 60);
      if (hours > 24) {
        this.log('[SOS] ⚠️ No activity for', Math.round(hours), 'hours');
        if (hours > 48) {this.setUnavailable('Device not responding').catch(() => { });}
      }
    }, 3600000);
  }

  _updateActivity() {
    this._lastActivity = Date.now();
    if (!this.getAvailable()) {this.setAvailable().catch(() => { });}
  }

  async _checkClustersAndWarn() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1?.clusters) {return;}
    const clusterNames = Object.keys(ep1.clusters);
    const hasEssential = clusterNames.some(n => ['iasZone', 'iasAce', 'tuya', 'onOff'].some(e => n.toLowerCase().includes(e.toLowerCase())));
    if (!hasEssential && clusterNames.length <= 2) {
      await this.setWarning('Interview failed! Please re-pair.').catch(() => { });
      await this.setUnavailable('Device needs re-pairing.').catch(() => { });
    } else {
      await this.unsetWarning().catch(() => { });
    }
  }

  async _verifyCieAddress() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const iasZone = ep1?.clusters?.iasZone;
    if (!iasZone?.writeAttributes) {return;}
    const ieee = await this._getCoordinatorIeee();
    if (ieee) {await iasZone.writeAttributes({ iasCIEAddress: ieee }).catch(() => { });}
  }

  /**
   * v5.5.833: Handle settings changes (toggle buttons for battery read / IAS re-enroll)
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SOS] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      if (key === 'refresh_battery' && newSettings.refresh_battery === true) {
        this.log('[SOS] Manual battery read triggered');
        await this._readBatteryNow();
        // Reset the toggle back to false
        await this.setSettings({ refresh_battery: false }).catch(() => { });
      }

      if (key === 're_enroll' && newSettings.re_enroll === true) {
        this.log('[SOS] Manual IAS Zone re-enrollment triggered');
        await this._verifyCieAddress();
        // Reset the toggle back to false
        await this.setSettings({ re_enroll: false }).catch(() => { });
      }
    }
  }

  async _getCoordinatorIeee() {
    // NEVER return/write the zero CIE — that actively breaks IAS enrollment
    // (forum #2134 Peter: SOS stuck "Laatste waarde onbekend" / battery "?").
    const isZero = (ieee) => {
      if (!ieee) {return true;}
      const hex = String(ieee).replace(/[:\-0x]/gi, '');
      return !hex || /^0+$/.test(hex);
    };
    if (IEEEAddressManager) {
      try {
        if (!this._ieeeManager) {this._ieeeManager = new IEEEAddressManager(this);}
        const ieee = await this._ieeeManager.getCoordinatorIeeeAddress();
        if (!isZero(ieee)) {return ieee;}
      } catch (e) { /* fall through */ }
    }
    const fallback = this.homey?.zigbee?.ieeeAddress;
    return isZero(fallback) ? null : fallback;
  }

  async onEndDeviceAnnounce() {
    this.log('[SOS] 📡 Device AWAKE (UDP-like Device Announce)');
    // v10.3.0 FIX (B4): Run the parent handler (cluster rebind, scene-mode
    // recovery) — this override used to shadow it.
    try { await super.onEndDeviceAnnounce?.(); } catch (_e) {}
    try {
      // v10.3.0 FIX (B5): capture activity timestamps BEFORE _updateActivity
      // stamps "now", so the heuristic below can tell a real idle wake from
      // an announce that follows a recent alarm.
      const lastAlarm = this._lastTrigger || 0;
      const lastActivity = this._lastActivity || 0;
      this._updateActivity();

      // Z2M Heuristics: Many TS0601 SOS buttons ONLY send Device Announce when pressed.
      // v10.3.0 FIX (B5): this heuristic caused false alarms on every
      // rejoin/power-cycle/pairing — it is now behind the
      // 'sos_announce_heuristic' setting (default OFF) and only fires when no
      // IAS/DP alarm arrived within the last 2s and the device was idle.
      if (this.getSetting?.('sos_announce_heuristic') === true) {
        const now = Date.now();
        if (now - lastAlarm > 2000 && now - lastActivity > 30000) {
          this.log('[SOS] 🚨 Device Announce heuristic enabled - Triggering physical alarm fallback');
          await this._handleAlarm({ source: 'device_announce_udp' });
        }
      }

      await this._readBatteryNow();
      await this._verifyCieAddress();
    } catch (err) {
      this.error('[SOS] ⚠️ Error during Device Announce processing:', err?.message || err);
    }
  }

  onUninit() {
    if (this._resetTimeout) {this.homey.clearTimeout(this._resetTimeout);}
    if (this._heartbeatInterval) {this.homey.clearInterval(this._heartbeatInterval);}
    if (this._batteryRetryTimer) {
      try { this.homey.clearTimeout(this._batteryRetryTimer); } catch (_e) { /* noop */ }
      this._batteryRetryTimer = null;
    }
  }

  async onDeleted() {
    this._destroyed = true;
    if (this._batteryRetryTimer) {
      try { this.homey.clearTimeout(this._batteryRetryTimer); } catch (_e) { /* noop */ }
      this._batteryRetryTimer = null;
    }
    await super.onDeleted();
    this.log('[SOS] Device deleted');
  }
}

module.exports = SosEmergencyButtonDevice;
