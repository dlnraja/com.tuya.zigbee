# L99 Inbox Harvest — 2026-08-31 (full pass)

Silent only — no forum POST (T157628).

## Sources processed

| Channel | Result |
|---------|--------|
| **L99 orchestrator** | 1 GitHub issue, 51 forum needAction, Gmail crash patterns OK |
| **Forum silent scan** | 22 topics, 215 posts, 0 new FPs |
| **Forum actionable processor** | 51 need action, 79 couples checked, 0 route changes |
| **Auto-investigate need-action** | 51 investigated → `reports/forum-verify-2026-08-31/NEED_ACTION.md` |
| **Gmail diagnostics** | 70 emails (L3 local), 6 new FP candidates (dry-run) |
| **GitHub** | #533 MOES curtain — only open issue |

## Code shipped this pass (P2356)

**GitHub #533 / salvagr** — `_TZE204_5slehgeo`+`TS0601` paired OK on ≥9.0.744; remaining gaps:

1. Manual position not syncing → `_handleTuyaDP` now routes DP1/2 through `_handleDP`
2. UI button errors → strip `button.1` on Moes ZTS (no listener)
3. DP 3/7/8/10 → settings `moes_*` + `_applyMoesZtsSettings` TX/RX
4. Timeout soft-continue on Moes DP sends

Files: `drivers/curtain_motor/device.js`, `driver.compose.json`, `test/critical/p2356-moes-curtain-rx-settings.test.js`

## Forum — user action (no reply)

Most needAction = **fixShipped** → update Test ≥9.0.750 (master) / 5.12.108 (stable) + re-pair if wrong driver.

| Priority | Topic | Note |
|----------|-------|------|
| Soft | T150690 #30 | `_TZ3000_xabckq1v`+TS004F — P2354 event mode shipped |
| Soft | T158757 #1 | `_TZ3218_t9ynfz4x`+TS0225 — verify before lock |
| Locked | T140352 #2188 | `_TZ3000_lwthnp7j`+TS0004 → wall_switch_4gang |
| Locked | T156967 #12 | `_TZ3000_wkai4ga5`+TS0044 → scene_switch_4 |

## Gmail crash patterns

All known fatals marked fixed (P100–P148). Watch: foreign driver ID (P2351), flow invalid cards.

## Next

- Publish master Test with P2356
- Backport P2356 to stable-v5 (BOTH)
- #533: close after salvagr confirms on tip ≥ next build
