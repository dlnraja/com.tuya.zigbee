# P208 — Protocol RX/TX chain (full path inventory)

**Date:** 2026-08-17  
**Track:** `MASTER_ONLY`

## Doctrine

Inventorier, croiser, améliorer et **enchaîner** tous les points d’accès :
Zigbee Tuya · DP EF00 · ZCL · Tuya bound (E000/E001/…) · cluster bind ·
raw frame/value · MCU · magic · IAS — pour anciens et nouveaux drivers.

## Landed

| Module | Role |
|--------|------|
| `lib/layers/ProtocolRxTxChain.js` | Catalog + `device.tx` / `device.rx` + IO wrap + peer cascade |
| `ProtocolFallbackChain` | + `tuya_bound_cluster`, `cluster_bind`, `tuya_bound_report`, `ias_zone`, `mcu_report` |
| `UniversalLayerBootstrap` | Attach after CrossLayer |
| Raw frame hook | `protocolRxTx.noteRx(clusterId)` |
| Docs / gate / tests | Updated |

## API

```js
await this.tx({ kind: 'dp', dp: 1, value: true, capability: 'onoff' });
await this.tx({ kind: 'zcl', cluster: 'onOff', attributes: { onOff: true } });
await this.tx({ kind: 'tuya_bound', boundClusters: [0xE000] });
await this.tx({ kind: 'mcu' }); // query_all / magic peer
await this.rx({ capability: 'measure_temperature', cluster: 0x0402, attrs: ['measuredValue'] });
this.protocolRxTx.inventory();
```

## Verify

```bash
node tools/ci/layer-coverage-gate.js
node --test test/critical/layer-coverage.test.js
```
