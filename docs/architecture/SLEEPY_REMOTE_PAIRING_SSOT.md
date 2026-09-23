# Sleepy remote pairing SSOT (P2645)

**Machine:** [`config/architecture/sleepy-remote-pairing-ssot.json`](../../config/architecture/sleepy-remote-pairing-ssot.json)  
**Gate:** `npm run check:p2645`  
**Classify:** BOTH (reliability — master + Bastien + stable-v5 surgical)  
**Doctrine:** P2520 complementary enrich — **union / append**; never wipe battery keep/rehydrate (P2470 / P2488 / P2490). **Skip ≠ strip** `measure_battery`.

## Verdict

Battery TS004x remotes (SED) often **sleep mid-pair**. Homey then times out on `powerConfiguration` configureReporting (`Impossible de joindre l’appareil`). Interview/bindings stay incomplete → **mute buttons**.

Fix is **two complementary layers** (not either/or):

1. **Code** — skip battery `configureReporting` / `getOnStart`/`getOnOnline` on button/sleepy drivers; quiet Time `0x000A` + OTA `0x0019` L0 spam.
2. **UX** — wake-tap every 2–3 s during the whole Homey pair window (Athom owns Zigbee pair UI; we teach via SMS / learnmode notes).

## Driver routing (gang = productId)

| productId | Prefer | Do not steal with |
|-----------|--------|-------------------|
| TS0041 | `button_wireless_1` / wall 1-btn | multi-gang drivers |
| TS0042 | `button_wireless_2` | wall 1-btn |
| TS0043 | `button_wireless_3` / `wall_remote_3_gang` | `remote_button_wireless_wall` |
| TS0044 | `button_wireless_4` / `scene_switch_4` | wall 1-btn |

**P2644b:** `remote_button_wireless_wall` compose `productId` = **TS0041 only**.

## Runtime map

| Concern | Module |
|---------|--------|
| skipBattCfg + getOnStart false | `lib/devices/BaseUnifiedDevice.js` |
| profile.skipBatteryReporting | `drivers/button_wireless_{1,3}/device.js` |
| unknown fallback skip | `lib/mixins/PhysicalButtonMixin.js` |
| quiet 0x000A / 0x0019 | `lib/tuya/TuyaZigbeeDevice.js` |
| flow ID no double-gang invent | `lib/flow/FlowCardHeuristics.js` (P2644) |

## Tips (min)

| Track | Tip |
|-------|-----|
| Universal `master` | ≥ **9.0.1195** (P2685 pile + P2689 adaptive) |
| Bastien `bastien-home` | ≥ **1.0.66** |
| Stable `stable-v5` | ≥ **5.12.308** |

See also [`THREE_APP_RECENT_TIPS.md`](./THREE_APP_RECENT_TIPS.md) · [`BATTERY_SSOT.md`](./BATTERY_SSOT.md) P2689.

## Contre quoi

- Re-enabling battery configureReporting storms on sleepy remotes
- Wall 1-btn reclaiming TS0043
- Stripping `measure_battery` from `button_*` (P2488 regression)
- Inventing `switch_1gang_1gang_turned_*` flow IDs
- Forum / AI paste replies (T157628) — silent code + SMS only

## Related SSOT

- [`PAIRING_DISCOVERY_SSOT.md`](./PAIRING_DISCOVERY_SSOT.md) — Homey-owned Zigbee pair
- [`BATTERY_SSOT.md`](./BATTERY_SSOT.md) — keep % UI; no linear V formulas; sleepy skip ≠ strip
- [`bastien-house-ssot.json`](../../config/architecture/bastien-house-ssot.json) — live house inventory
- [`COMPLEMENTARY_VARIANT_ENRICH.md`](../rules/COMPLEMENTARY_VARIANT_ENRICH.md) — union never degrade
