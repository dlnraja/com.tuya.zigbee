'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * BSEED Wall Switch 1-Gang 1-Way - ZCL-Only Implementation
 * PR #118 by @packetninja (Attilla de Groot) - v5.5.941
 * 
 * BSEED devices use PURE ZCL - NO Tuya DP protocol!
 * Compatible: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk
 */
class WallSwitch1Gang1WayDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[BSEED] ════════════════════════════════════════');
    this.log('[BSEED] Wall Switch 1-Gang 1-Way (ZCL-Only)');
    this.log('[BSEED] PR #118 by @packetninja - v5.5.941');
    this.log('[BSEED] ════════════════════════════════════════');

    this.zclNode = zclNode;
    this._state = { lastOnoff: null, appPending: false, timeout: null };

    // Debug: print node info
    if (typeof this.printNode === 'function') this.printNode();

    await this._setupZclOnOff(zclNode);
    await this._setupCustomClusters(zclNode);

    this.log('[BSEED] ✅ Ready - ZCL onOff + physical button detection');
  }

  async _setupZclOnOff(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    const cluster = ep?.clusters?.onOff;

    if (!cluster) {
      this.error('[BSEED] ❌ No onOff cluster on EP1!');
      return;
    }

    // Listen for attribute reports (physical button presses)
    if (typeof cluster.on === 'function') {
      cluster.on('attr.onOff', (value) => {
        this.log(`[BSEED] 📥 attr.onOff = ${value}`);
        this._handleOnOffChange(value, !this._state.appPending);
      });
      this.log('[BSEED] ✅ attr.onOff listener registered');
    }

    // Read initial state
    try {
      const attrs = await cluster.readAttributes(['onOff']);
      if (attrs?.onOff !== undefined) {
        this._state.lastOnoff = attrs.onOff;
        await this.setCapabilityValue('onoff', attrs.onOff).catch(() => {});
        this.log(`[BSEED] 📖 Initial: ${attrs.onOff ? 'ON' : 'OFF'}`);
      }
    } catch (e) {
      this.log(`[BSEED] ⚠️ Read failed: ${e.message}`);
    }

    // Register capability listener for app commands
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[BSEED] 📤 App command: ${value ? 'ON' : 'OFF'}`);
      this._markAppCommand();
      try {
        await cluster[value ? 'setOn' : 'setOff']();
        this.log(`[BSEED] ✅ ZCL ${value ? 'ON' : 'OFF'} sent`);
        return true;
      } catch (e) {
        this.error(`[BSEED] ❌ ZCL failed: ${e.message}`);
        throw e;
      }
    });
  }

  _handleOnOffChange(value, isPhysical) {
    if (this._state.lastOnoff !== value) {
      this.log(`[BSEED] State: ${this._state.lastOnoff} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
      this._state.lastOnoff = value;
      this.setCapabilityValue('onoff', value).catch(() => {});

      // Trigger flow cards for physical button presses
      if (isPhysical) {
        const flowId = value ? 'wall_switch_1gang_1way_turned_on' : 'wall_switch_1gang_1way_turned_off';
        this.homey.flow.getDeviceTriggerCard(flowId)
          .trigger(this, {}, {})
          .catch(err => this.log(`[BSEED] Flow error: ${err.message}`));
        this.log(`[BSEED] 🔘 Physical button ${value ? 'ON' : 'OFF'} triggered`);
      }
    }
  }

  _markAppCommand() {
    this._state.appPending = true;
    if (this._state.timeout) clearTimeout(this._state.timeout);
    const window = this.getSetting?.('app_command_timeout') || 2000;
    this._state.timeout = setTimeout(() => {
      this._state.appPending = false;
      this.log('[BSEED] App command window closed');
    }, window);
  }

  async _setupCustomClusters(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    for (const clusterId of [57344, 57345]) {
      const cluster = ep?.clusters?.[clusterId];
      if (cluster) {
        this.log(`[BSEED] ✅ Custom cluster 0x${clusterId.toString(16)} found`);
        if (typeof cluster.on === 'function') {
          cluster.on('attr', (attrId, val) => {
            this.log(`[BSEED] 0x${clusterId.toString(16)} attr ${attrId}: ${JSON.stringify(val)}`);
          });
        }
      }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`[BSEED] Settings changed: ${changedKeys.join(', ')}`);
    
    // LED backlight control via DP15 (if device supports Tuya DP for settings)
    if (changedKeys.includes('backlight_mode')) {
      const mode = newSettings.backlight_mode;
      const dpValue = { off: 0, normal: 1, inverted: 2 }[mode] ?? 1;
      this.log(`[BSEED] 💡 Backlight: ${mode} (DP15=${dpValue})`);
      
      // Try Tuya DP first (some BSEED support it for settings)
      try {
        const ep = this.zclNode?.endpoints?.[1];
        const tuyaCluster = ep?.clusters?.tuya || ep?.clusters?.[61184];
        if (tuyaCluster?.datapoint) {
          const cmd = Buffer.alloc(7);
          cmd.writeUInt16BE(Math.floor(Math.random() * 65535), 0);
          cmd[2] = 15; cmd[3] = 4; cmd.writeUInt16BE(1, 4); cmd[6] = dpValue;
          await tuyaCluster.datapoint({ data: cmd });
          this.log('[BSEED] ✅ Backlight set via Tuya DP');
        }
      } catch (e) {
        this.log(`[BSEED] ⚠️ Backlight DP failed: ${e.message}`);
      }
    }
  }

  onDeleted() {
    if (this._state?.timeout) clearTimeout(this._state.timeout);
    this.log('[BSEED] Device removed');
  }
}

module.exports = WallSwitch1Gang1WayDevice;
