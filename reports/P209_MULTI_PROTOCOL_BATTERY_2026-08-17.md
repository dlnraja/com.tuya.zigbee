# P209 — Multi-protocol battery percent

**Date:** 2026-08-17  
**Track:** `MASTER_ONLY`

## Goal

Fine-grained battery **percentage** support whatever the transport:
Zigbee ZCL · Tuya DP · WiFi/local · IAS/ACE (`acl`) · voltage · raw · MCU — with
cross-layer confirm and no linear voltage formulas.

## Landed

| Piece | Role |
|-------|------|
| `lib/battery/MultiProtocolBatteryPercent.js` | normalize + commit + `device.ingestBatteryPercent` |
| `SmartBatteryManager._safeSet` | routes `%` through MultiProtocol |
| `UnifiedBatteryHandler._safeSetCap` | same for unified handler |
| `CrossLayerRedundancy` | attaches helpers; SmartCap sources include wifi/ias/raw/mcu |
| Tests / gate / docs | updated |

## Usage

```js
await this.ingestBatteryPercent(200, { protocol: 'zcl' });           // → 100%
await this.ingestBatteryPercent(87, { protocol: 'wifi' });
await this.ingestBatteryPercent(dpVal, { protocol: 'tuya-dp', dp: 14 });
await this.ingestBatteryPercent(true, { protocol: 'acl' });          // IAS low → 10%
await this.ingestBatteryPercent(3000, { protocol: 'voltage' });      // curve, not linear
```

## Verify

```bash
node --test test/critical/multi-protocol-battery.test.js
node tools/ci/layer-coverage-gate.js
```
