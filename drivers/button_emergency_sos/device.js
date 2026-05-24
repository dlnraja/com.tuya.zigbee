'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

let IEEEAddressManager = null;
try {
  IEEEAddressManager = require('../../lib/managers/IEEEAddressManager');
} catch (e) {
  console.log('[SOS] IEEEAddressManager import failed:', e.message);
}

let IasAceBoundCluster = null;
try {
  const iasAce = require('../../lib/clusters/IasAceCluster');
  IasAceBoundCluster = iasAce.IasAceBoundCluster;
} catch (e) {
  console.log('[SOS] IasAceCluster import failed:', e.message);
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SOS EMERGENCY BUTTON - v5.5.804 UNIVERSAL ARCHITECTURE                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports: IAS ACE, IAS Zone, Tuya DP, and genOnOff                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SosEmergencyButtonDevice extends TuyaZigbeeDevice {

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
    const caps = ['alarm_generic', 'measure_battery'];
    for (const cap of caps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
    await this.setCapabilityValue('alarm_generic', false).catch(() => { });
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

    // Enrollment
    iasZone.onZoneEnrollRequest = async () => {
      this.log('[SOS] Zone Enroll Request received');
      try {
        await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 0 });
        this.log('[SOS] ✅ Enroll Response sent (zoneId: 0)');
      } catch (e) {
        this.error('[SOS] Enroll response failed:', e.message);
      }
    };

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
    // Battery DPs
    if (dp === 4 || dp === 15 || (dp === 101 && typeof value === 'number')) {
      const battery = Math.min(100, Math.max(0, parseInt(value, 10)));
      if (!isNaN(battery)) {
        await this.setCapabilityValue('measure_battery', battery).catch(() => { });
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
    this._updateActivity();

    const now = Date.now();
    if (now - this._lastTrigger < 2000) {return;}
    this._lastTrigger = now;

    this.log('[SOS] 🆘 SOS BUTTON PRESSED!', JSON.stringify(payload));

    // Wake up actions
    this._readBatteryNow().catch(() => {});
    this._verifyCieAddress().catch(() => {});

    // Set capability and trigger flow
    await this.setCapabilityValue('alarm_generic', true).catch(() => { });
    if (this.driver?.triggerSOS) {
      await this.driver.triggerSOS(this);
    }

    // Auto-reset
    if (this._resetTimeout) {this.homey.clearTimeout(this._resetTimeout);}
    this._resetTimeout = this.homey.setTimeout(async () => {
      await this.setCapabilityValue('alarm_generic', false).catch(() => { });
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
  }

  async _updateBattery(value, type) {
    if (value === undefined || value === null || value === 255) {return;}
    
    let percent;
    if (type === 'percentage') {
      percent = value > 100 ? Math.round(value / 2) : value;
    } else {
      const voltage = smartParse(value, null, { capability: 'measure_voltage' });
      percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
    }

    if (percent >= 0 && percent <= 100) {
      await this.setCapabilityValue('measure_battery', percent).catch(() => { });
      this._updateActivity();
    }
  }

  async _readBatteryNow() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;
    if (!powerCfg?.readAttributes) {return;}

    try {
      const result = await Promise.race([
        powerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
        new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 1500))
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
    this._heartbeatInterval = this.homey.setInterval(() => {
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

  async _getCoordinatorIeee() {
    if (IEEEAddressManager) {
      try {
        if (!this._ieeeManager) {this._ieeeManager = new IEEEAddressManager(this);}
        return await this._ieeeManager.getCoordinatorIeeeAddress();
      } catch (e) { }
    }
    return this.homey?.zigbee?.ieeeAddress || '00:00:00:00:00:00:00:00';
  }

  async onEndDeviceAnnounce() {
    this.log('[SOS] 📡 Device AWAKE');
    this._updateActivity();
    await this._readBatteryNow();
    await this._verifyCieAddress();
  }

  onUninit() {
    if (this._resetTimeout) {this.homey.clearTimeout(this._resetTimeout);}
    if (this._heartbeatInterval) {this.homey.clearInterval(this._heartbeatInterval);}
  }

  async onDeleted() {
    this.log('[SOS] Device deleted');
  }
}

module.exports = SosEmergencyButtonDevice;
