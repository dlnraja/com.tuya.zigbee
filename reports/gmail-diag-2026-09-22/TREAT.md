# Gmail / Homey diag treat — 2026-09-22 (L99 INTEGRAL)

Silent only. No forum POST (T157628). Lock mfr+pid only.

See also: [`TREAT_INTEGRAL_2026-09-22.md`](../TREAT_INTEGRAL_2026-09-22.md)

## Classification (right app / repo)

| UUID / signal | App version in mail | Track | Verdict | Action |
|---------------|---------------------|-------|---------|--------|
| **149bc1a5** | Universal **9.0.1165** | master | HEAP OOM `Builtin_JsonParse` → SIGABRT | Tip **≥9.0.1182** (P2674+P2678) |
| **cb3c0c87** | Bastien ≤1.0.51 | bastien | MODULE_NOT_FOUND zigbeedriver | Tip **≥1.0.58** (P2676) |
| be119f76 / e8d98608 / … | Bastien ≤1.0.34 | bastien | Tip-lag + Virtual mis-pair | Update ≥**1.0.58**; remove Homey Virtual; re-pair |
| Stable crash 5.12.288/290 | Stable | stable-v5 | Tip-lag | Tip **5.12.300** #215 |
| Soft `kfu8zapd`+TS0044 | — | BOTH | Was wrong soft-hyp | **P2679** → `button_wireless_4` |
| Soft `wkai4ga5`+TS0044 | — | BOTH | Was wrong soft-hyp | **P2679** → `scene_switch_4` |
| GH #550 HiepSVG `gkfbdvyx`+TS0601 | ≤9.0.1059 | master | Presence RX / phantom onoff | Tip + re-pair |
| GH #551 `_TZ3000_famkxci2`+TS0043 | ≤9.0.1086 | master | Compose OK, wrong Generic tile | Update + re-pair Wireless 3-Button |

## Fixes shipped

1. **P2674–P2678** boot OOM / curated FP / soft-require / HOBEIAN caseless / fp-shards
2. **P2679** sacred couple lock + soft-hypotheses correction + Contre quoi test
3. Stable: P2671 multi-brand mfs align skip (Heobian orphan fixed)

## Live tips (Gmail)

- Universal **9.0.1182** Test #3331 testing
- Stable **5.12.300** #215 testing
- Bastien **1.0.58** #68 testing

## Dual-app

**BOTH** reliability. Stable surgical align + couples. Bastien tip-lag only for MODULE_NOT_FOUND.
