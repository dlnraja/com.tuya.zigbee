'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { zoneFromMeta, makeBound } = require('./zone-commands');

const D = 'remote_rgbcct_8zone';

/**
 * MiBoxer FUT089Z RGB+CCT remote, 8 zones. Exact couple _TZ3000_xwh1e22x + TS1002.
 * Native ZCL only: battery from powerConfiguration, commands received through bound onOff / levelControl /
 * colorControl clusters (group casts carry meta.groupId → zone). Each command fires one flow trigger with
 * a zone token; triggers can be filtered on a zone.
 */
class RemoteRgbCct8ZoneDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this._zclNode = zclNode;
    try {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    } catch (e) { this.log('[FUT089Z] battery capability skipped:', e.message); }

    const emit = (event, data, meta) => this._emit(event, data, meta);
    const { OnOff, Level, Color } = makeBound(emit);
    const ep = zclNode.endpoints[1];
    for (const [name, Cls] of [[CLUSTER.ON_OFF.NAME, OnOff], [CLUSTER.LEVEL_CONTROL.NAME, Level], [CLUSTER.COLOR_CONTROL.NAME, Color]]) {
      try { ep.bind(name, new Cls()); } catch (e) { this.log(`[FUT089Z] bind ${name} skipped:`, e.message); }
    }
    this.log('[FUT089Z] ready (zones via group base', this._base(), ')');
  }

  _base() { return Number(this.getSetting('zone_group_base') ?? 100); }

  _emit(event, data, meta) {
    const zone = zoneFromMeta(meta, this._base());
    const tokens = { zone, ...data };
    this.log(`[FUT089Z] ${event} zone=${zone}`, JSON.stringify(data));
    const card = this.homey.flow.getDeviceTriggerCard(`${D}_${event}`);
    card.trigger(this, tokens, { zone }).catch((e) => this.error(`[FUT089Z] trigger ${event}: ${e.message}`));
  }
}

module.exports = RemoteRgbCct8ZoneDevice;
