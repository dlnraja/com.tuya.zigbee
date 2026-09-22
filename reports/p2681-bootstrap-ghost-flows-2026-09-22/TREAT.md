# TREAT P2681 — random button flows + Bastien remotes (2026-09-22)

Silent only. No forum POST (T157628). Dual-app **BOTH**.

## New reports (Gmail)

| Log | App | Couple / signal | Verdict |
|-----|-----|-----------------|---------|
| **8f0915fa** | Bastien **1.0.53** | `_TZ3000_dzwgk7e2`+TS0042; many `switch_1gang` | 2-btn sticky slow; **null→false PHYSICAL** floods `switch_1gang_physical_off` → random Flows |
| **f37e8a91** | Bastien **1.0.53** | same couple | profile `undefined`; identity re-arm; tip-lag |
| cb3c0c87 | Bastien 1.0.51 | MODULE_NOT_FOUND | tip ≥1.0.58 (P2676) |

## Root causes

1. **Ghost physical flows** — first ZCL/DP sample after init has `lastState=null`; treated as PHYSICAL → every wall switch fires `*_physical_off/on` into Homey Flows when mesh reports.
2. **Profile shadow** — `BaseUnifiedDevice.getDeviceProfile()` returned only `_deviceProfile`, swallowing `PhysicalButtonMixin` DEVICE_PROFILES → weak 200ms debounce / undefined brand on remotes.
3. **dzwgk7e2** — needs hybrid sticky profile (debounce 1200, skip8004, buttonCount=2).

## Code ship

- `PhysicalButtonMixin`: bootstrap seed (no flow); capability seed at init; dzwgk7e2 profile; TS0042/43/44 fallback debounce 1200; harden `_getTimingProfile`
- `BaseUnifiedDevice.getDeviceProfile`: merge mixin + registry
- `button_wireless_2`: sticky `getDeviceProfile` override
- Contre quoi: `npm run check:p2681`

## User actions

1. Update **Universal** / **Bastien** / **Stable** to tip after publish
2. Reboot app (ghost flows stop without re-pair for switches)
3. Sticky 2-btn still slow → wake-tap + optional remove/re-pair under Wireless Button 2
