# Identity fields SSOT (P2496) — pid vs productId vs productName

> Machine: [`config/architecture/identity-fields-ssot.json`](../../config/architecture/identity-fields-ssot.json)  
> Helper: `tools/ci/sacred-couple-pair.js` · Gate: `npm run check:p2496`  
> Homey: [Zigbee apps](https://apps.developer.homey.app/wireless/zigbee) · [Zigbee tools](https://apps.developer.homey.app/guides/tools/zigbee)

## Verdict (one screen)

| Term | What it is | Pairing? |
|------|------------|----------|
| **manufacturerName** | Homey compose + Zigbee Basic manufacturer | **YES** (half of sacred couple) |
| **productId** | Homey compose field (= Zigbee **Model ID** / `modelId`) | **YES** (other half) |
| **modelId** | Zigbee / interview / Z2M name for the same string as productId | Same value — not a second ID |
| **pid** | Our internal shorthand for productId/modelId | Same value |
| **productName(s)** | Marketing / CSA / Cloud / mfs alias | **NO** — never pairing |

Athom Zigbee tools explicitly say: *“Model ID: This is the `productId` you should include in your driver's manifest.”*

## Why agents get confused

1. Homey **compose** says `productId`, but interviews and Z2M say `modelId`.
2. This repo shortens to **`pid`** in gates/JSON.
3. **`productName`** sounds like productId but is a **human label** (SH-SC07, ERS-10, “Smart switch”).
4. Settings must be **`zb_model_id`** / **`zb_manufacturer_name`** — never camelCase.

## Cross-app map

| Ecosystem | Manufacturer | Model / product |
|-----------|--------------|-----------------|
| Homey SDK3 compose | `manufacturerName` | `productId` |
| Homey Zigbee tools UI | Manufacturer | Model ID → compose `productId` |
| Zigbee Basic / interview JSON | `manufacturerName` | `modelId` |
| Zigbee2MQTT / herdsman | `manufacturerName` | `modelID` |
| ZHA | manufacturer | model |
| Johan Bendz apps | same Homey compose fields | ProductId from interview |
| Tuya Cloud WiFi | n/a Zigbee | `product_name` (catalog only) |

## Resolution order (runtime / CI)

**productId / pid:** `productId` → `pid` → `modelId` → `zb_model_id` → `zclNode.modelId`  
**manufacturerName:** `manufacturerName` → `mfr` → `zb_manufacturer_name` → `zclNode.manufacturerName`  

**Never** read as productId: `productName`, `productNames`, `product_name`, `deviceNames`, retail SKU alone.

## mfs_db

- `modelIds` / `pid` = real Zigbee productIds  
- `productNames` / `deviceNames` / `z2mModels` = aliases (N:N), not couples  
- One mfr → many modelIds is **NORMAL**

## Contre quoi

- Inventing a pid from a productName/SKU  
- Writing Cloud `product_name` into `zb_model_id`  
- Using `zb_modelId` / `zb_manufacturerName`  
- Treating `pid` and `productId` as different Homey fields
