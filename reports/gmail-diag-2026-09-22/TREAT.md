# Gmail / Homey diag treat — 2026-09-22 (L99)

Silent only. No forum POST (T157628). Lock mfr+pid only.

## Classification (right app / repo)

| UUID / signal | App version in mail | Track | Verdict | Action |
|---------------|---------------------|-------|---------|--------|
| **149bc1a5** | Universal **9.0.1165** | master | HEAP OOM `Builtin_JsonParse` → SIGABRT | **SHIP** tip **9.0.1177** (P2674+P2675+P2676) |
| **cb3c0c87** | Bastien ≤1.0.51 | bastien | MODULE_NOT_FOUND zigbeedriver | **SHIPPED** tip **1.0.55** #64 (P2676 soft-require) |
| be119f76 / e8d98608 / … | Bastien ≤1.0.34 | bastien | Tip-lag + Virtual mis-pair | Update ≥**1.0.55**; remove Homey Virtual; re-pair |
| af98752d / radar scale | Stable **5.12.288/290** | stable-v5 | Tip-lag `TuyaRadarRangeScale` | Tip already **5.12.296** — **no republish** |
| GH #550 HiepSVG `gkfbdvyx`+TS0601 | ≤9.0.1059 | master | Presence RX / phantom onoff | Tip + re-pair (P2484) |
| GH #551 `_TZ3000_famkxci2`+TS0043 | ≤9.0.1086 | master | Compose OK, wrong Generic tile | Update + re-pair Wireless 3-Button |

## Fixes this ship (master BOTH)

1. **P2674** DeviceFingerprintDB curated-first; skip broad JSON under BootBudget; DriverMappingLoader defer; Misattribution soft-empty.
2. **P2675** curated ← sacred-keep (~430 keys, <200KB).
3. **P2676** soft-require `homey-zigbeedriver` in ZigBeeDriverFlowCardPatch + app.js try/catch + prepare-publish gate.
4. Gates: `npm run check:p2674` / `p2675` / `p2676`.

## User actions

- Universal Test: update to **≥9.0.1177** after Auto-Publish.
- Bastien: update **≥1.0.55**; drop Homey Virtual tiles; re-pair under Bastien.
- Stable: stay on **≥5.12.296** (already tip).

## Dual-app

**BOTH** reliability on master. Stable tip-lag only — no surgical backport needed this cycle (radar soft-require already tip).
