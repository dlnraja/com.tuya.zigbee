'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');

/**
 * AutomatOn AUT000069 — underfloor heating / irrigation valves controller, 5 zones.
 * Exact couple only: _TZ3000_j0ktmul1 + TS011F.
 * WHY: five native ZCL onOff endpoints (1..5), Tuya magic packet on configure, onOff reporting per
 * endpoint. Sources: Zigbee2MQTT automaton.ts (Koen Kanters and contributors, herdsman-converters
 * PR #5579, zigbee2mqtt #16992) and lsroka76/Z2S_Library device database. Our own implementation on
 * the shared UnifiedSwitchBase (ZCL first; no Tuya DP needed).
 */
class ValveController5ZoneDevice extends UnifiedSwitchBase {
  get gangCount() { return 5; }
}

module.exports = ValveController5ZoneDevice;
