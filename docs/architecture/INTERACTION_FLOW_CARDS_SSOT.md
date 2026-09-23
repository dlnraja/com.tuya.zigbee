# Interaction Flow Cards SSOT (P2687)

Machine: [`config/architecture/interaction-flow-cards-ssot.json`](../../config/architecture/interaction-flow-cards-ssot.json)  
Capability UX: [`HOMEY_CAPABILITY_UX_SSOT.md`](./HOMEY_CAPABILITY_UX_SSOT.md) · gate `npm run check:p2687` / `check:p2500`  
Classify: **MASTER_ONLY** (SoftFeature UX — Daylight-class). Bastien house sync OK. **No Stable backport.**

## Why (P215)

Users want Homey Flow cards that work **partout** (every device of this app): list capabilities, list actionable controls, and read recent interaction history (press / onoff / dim / cover…).

Inspired silently by Device Capabilities (T43287 READ-ONLY) — do **not** clone AVD / DynCap phantoms.

## Tips (min)

| Track | Tip |
|-------|-----|
| Universal `master` | ≥ **9.0.1194** (prefer ≥ **9.0.1195**) |
| Bastien `bastien-home` | ≥ **1.0.65** (prefer ≥ **1.0.66**) |
| Stable `stable-v5` | — not shipped (MASTER_ONLY) |

## Cards

| Type | ID | Role |
|------|-----|------|
| Action | `list_device_capabilities` | CSV + count of all caps |
| Action | `list_device_actions` | Setable / action-like only |
| Action | `list_recent_interactions` | Per-device ring (readable text + count) |
| Action | `list_fleet_recent_interactions` | Fleet ring (max 50) |
| Action | `capability_historical_value` | N minutes ago — **no** `capabilities=onoff` filter + `value` token |
| Trigger | `device_interaction` | Action-like capability change (tokens: name, cap, value, kind) |
| Condition | `device_interacted_recently` | Interaction within X minutes |

Compose: `.homeycompose/flow/{actions,triggers,conditions}/`  
Runtime: `lib/flow/FeatureFlowCards.js` + `lib/flow/InteractionHistory.js`  
RX path: `TuyaZigbeeDevice` → `triggerCapabilityChanged` → history rings.

## Contre quoi

- Re-adding `filter: capabilities=onoff` on historical / list cards
- Shipping without register listeners in FeatureFlowCards
- Backporting to Stable LTS as a “feature sync”
- Forum / AI paste (T157628)

## Related

- P2689 adaptive battery (BOTH) — separate SSOT
- P2500 capability UX — generic trigger already all-devices
- P2520 complementary enrich — union cards, never wipe
