# SESSION HANDOFF — 2026-08-17 (P212 local → commit)

> Shared App ID. Silent forum. Dual-track: master=smart, stable=reliability-only.

| Track | Tip | Homey Test |
|-------|-----|------------|
| master | **P212** commitCapability + energy/buttons + 0x000A quiet + TS0043 | Auto-Publish after push |
| stable-v5 | No P207–P212 copycat (MASTER_ONLY layers) | soak-skip; do not overwrite 9.x Test |

## P212 (MASTER_ONLY)
- Funnel: EF00 / IAS / mixin / battery / energy / virtual buttons → `commitCapability` → fusion + L14
- No invented 15% / 100% battery
- Estimated W/kWh cannot overwrite fresh ZCL power
- Button ZCL+DP echo suppressed (280 ms)
- Time cluster 0x000A: respond on request; no poll on sleepy remotes/sensors
- Zemismart TS0043 (`_TZ3000_a7ouggvs`, `_TZ3000_qzjcsmar`) → `button_wireless_3` (was wrongly on 2-gang)
- `_TZ3000_k4ej3ww2`+TS0207 stays `water_leak_sensor` (already locked)

## Forum (silent)
Do not auto-post. Drafts for #2168/#2169 stay in the chat only.

Open issues/PRs: none critical. Peter crash class already on tip (P203); no new diag in this pass.
