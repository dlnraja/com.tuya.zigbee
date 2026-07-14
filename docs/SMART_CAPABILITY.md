# SmartCapability Pattern — P57 Guide

## The Problem

A device can report the **same data** through multiple channels:

| Channel | Example | Notes |
|---|---|---|
| **Low-level RX** | ZCL attribute report | From the radio |
| **Low-level RW** | Tuya DP (Data Point) | From the protocol |
| **Cached** | `getSettings()` | Last known value |
| **Derived** | Voltage → battery % curve | Calculated from raw voltage |
| **Last known** | State store | Persisted across reboots |
| **Flow** | User-triggered update | Via Homey flow card |

Without dedup, the same capability can be set 5+ times per minute with the same value. This:
- Floods the device state
- Wakes Zigbee neighbors (high-power)
- Triggers unnecessary flow cards
- Confuses users with repeated "device changed" events

## The Solution: SmartCapability

`lib/data/SmartCapability.js` provides a single API that:
1. **Records** values from multiple sources with confidence scores
2. **Cross-validates** — only commits when sources agree (within tolerance)
3. **Debounces** — no commits within `debounceMs` (anti-flood)
4. **Hysteresis** — no commits for unchanged values
5. **Falls back** to next source when primary fails
6. **Recovers** — last known good value when ALL sources fail

## Architecture

```
┌─────────────────┐
│ ZCL attribute   │──┐
└─────────────────┘  │
┌─────────────────┐  │  confidence  ┌────────────────────────┐
│ Tuya DP         │──┼───────────────▶  SmartDataValidator   │
└─────────────────┘  │                │  - cross-validate     │
┌─────────────────┐  │                │  - debounce/hysteresis│
│ Voltage curve   │──┘                │  - fallback           │
└─────────────────┘                   │  - dedup              │
                                      └────────────┬───────────┘
                                                   │ commit decision
                                                   ▼
                                      ┌────────────────────────┐
                                      │ setCapabilityValue()   │
                                      └────────────────────────┘
```

## Usage in a Device

```js
const { installSmartCapMixin } = require('../../lib/data/SmartCapability');

class MyDevice extends BaseDevice {
  onNodeInit() {
    installSmartCapMixin(this);  // OR on the class itself in init

    // Register smart capability for battery
    this.battery = this.smartCap('measure_battery', {
      sources: {
        'zcl':       { priority: 1, weight: 0.4, ttl: 60000 },
        'tuya-dp':   { priority: 2, weight: 0.3, ttl: 30000 },
        'voltage':   { priority: 3, weight: 0.2, ttl: 30000 },
        'cached':    { priority: 8, weight: 0.05, ttl: 86400000 },
        'last-known':{ priority: 9, weight: 0.05, ttl: 604800000 },
      },
      debounceMs: 500,        // min ms between commits
      hysteresisMs: 30000,    // min ms between same-value commits
      method: 'weighted',     // weighted | majority | highest-confidence | last
    });
  }

  // On ZCL attribute receive
  onBatteryAttribute(value) {
    this.battery.update(this, 'zcl', value, 0.95);
  }

  // On Tuya DP receive (DataPoint 4 = battery %)
  onTuyaBatteryDP(value) {
    this.battery.update(this, 'tuya-dp', value, 0.85);
  }

  // On voltage read (calculate %)
  onVoltage(voltage_mV) {
    const pct = this.voltageToPercent(voltage_mV);
    this.battery.update(this, 'voltage', pct, 0.7);
  }

  // On source error
  onZCLTimeout() {
    this.battery.markFailed('zcl', 'timeout');
  }

  // On device uninit
  onDeleted() {
    this.battery.reset();
  }
}
```

## Aggregation Methods

| Method | When to use |
|---|---|
| `weighted` | Default. Weighted average by source priority + confidence. |
| `majority` | When sources may disagree (e.g. ZCL=70%, voltage=85% on flat discharge). Picks the most-populated cluster. |
| `highest-confidence` | When you trust ONE source (e.g. ZCL) and others are fallbacks. |
| `last` | When freshness matters more than accuracy (always use newest). |

## Anti-Flooding Stats

SmartCapability tracks:
- `records` — total `update()` calls
- `commits` — `setCapabilityValue` actually triggered
- `flooded` — blocked by debounce
- `deduped` — blocked by hysteresis (same value)
- `fallbacks` — primary source failed, used secondary

```js
const stats = this.battery.getStats();
console.log(`Battery: ${stats.records} records → ${stats.commits} commits (${stats.deduped} deduped, ${stats.flooded} flooded)`);
```

## When to Apply

Recommended for capabilities that:
- Have **multiple sources** (ZCL + Tuya DP + cached)
- Are set **frequently** (more than once per minute)
- Can come from **different levels** (RX + flow + cached)

Top candidates from audit (`tools/ci/detect-data-flooding.js`):
1. `sensor_presence_radar` — `alarm_motion` set 8x
2. `sensor_presence_radar` — `measure_battery` set 6x
3. `power_clamp_meter` — `measure_power` set 5x
4. `motion_sensor` — `measure_battery` set 4x
5. `sensor_climate_contact` — `measure_*` set 4x each

## Testing

```bash
node tools/ci/test-smart-data-validator.js
# 50/50 tests pass

node examples/SmartCapabilityExample.js
# Live demo: 5 scenarios demonstrating anti-flooding, fallback, recovery
```

## Compatibility

- Pure Node.js, no Homey SDK dependency
- Works in any Device class with `setCapabilityValue`
- Mixin `installSmartCapMixin(DeviceClass)` is idempotent
- Backwards-compatible: existing drivers can adopt incrementally
