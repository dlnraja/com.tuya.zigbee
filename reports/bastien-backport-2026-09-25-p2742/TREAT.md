# P2742 — Bastien → master/stable complementary BOTH backport (2026-09-25)

## Trigger
Owner launched Install of Zigbee Bastien Test on Bastien Homey account.
Mandate: promote Bastien house soak upstream intelligently by maturity (complementary enrich).

## Classification

| Patch | Tag | Master | Bastien | Stable action |
|-------|-----|--------|---------|---------------|
| P2733–P2736 snappy wake / bi-dir soft UI | BOTH | already ≥9.0.1254 | ≥1.0.107 | **ported → 5.12.340** |
| P2739 no magic/DP wake TX | BOTH | already | ≥1.0.107 | **ported** |
| P2740 lux/distance antiflood | BOTH | ≥9.0.1256 | — | **ported** |
| P2741 skip MCU sync remotes | BOTH | ≥9.0.1257 | ≥1.0.108 | **ported** |
| P2737 tip-lag docs / Bastien house-fleet slim | Bastien / MASTER_ONLY CI | keep | keep | **not** ported |
| P2738 soft-expect Bastien publish | publish CI | soft | yes | **not** identity |
| P2687 interaction Flow cards | MASTER_ONLY | keep | sync OK | **never** Stable |

## Stable files (union / copy soak-proven)
- `BaseUnifiedDevice` / `ButtonDevice` / `PhysicalButtonMixin` / `AutoAdaptiveDevice` / `UnifiedButtonEngine`
- `HomeyButtonUiCharter` + `WallSceneRemoteHybridInit` + bw1/2/3 soft-arm
- P2740 throttle + EventDedup + radar ceiling thresholds
- Contre quoi: `p2733`–`p2736`, `p2739`, `p2740`, `p2741`

## Tips
- Universal: **9.0.1257** (unchanged this turn — already had stack)
- Bastien: **1.0.108** (owner Install)
- Stable: **5.12.340** (this backport)

## Gates
`node --test test/critical/p273{0,3,4,9}*.test.js test/critical/p274{0,1}*.test.js` — green on stable.
