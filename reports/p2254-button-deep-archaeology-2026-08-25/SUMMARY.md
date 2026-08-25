# P2254 — Deep archaeology: multi-button / wall-gang / battery / scene

**Date:** 2026-08-25  
**Sources:** git `master` + `stable-v5` + Homey changelogs + forum-verify 08-23/24 + diags + DEVICE_TRUTH + prior commits P92→P2253  
**Policy:** silent enrich only; no forum posts; no invented pids.

## Verdict

Recent button pain is **not one bug** — it is a stack of regressions that keep reappearing:

1. **Wrong driver** (wireless remote as wall / 2-gang / IR / door)
2. **0x8004 wake spam** on TS0041–44 (master briefly worse than 5.x)
3. **Missing 0xFD BoundCluster** (physical silent, UI OK)
4. **First press after sleep** (missing magic `0xFFDE=0x13`)
5. **Flow ID / bidirectional / battery** side effects

Stable tip (`09c8666d4` P2249) already has core 0xFD + TS0044 skip + magic. Master WIP (P2253/P2254) goes further: wider mfr skip list, profile `skip8004` as **active gate**, compensation never queues `ts004f_scene_mode` for TS0041–44, honest UI hints + LED doctrine.

---

## Timeline (investigation posts in commits / changelogs)

| Era | Patch | WHY |
|-----|-------|-----|
| P92.65 | 0x8004 listener + `reverse_button_order` | Manual scene/dimmer |
| P92.93 | wall_switch_4gang_1way physical init | #2099 never called mixin |
| P92.95–96 | kfu8zapd→bw4; tzvbimpq→bw2 | Forum misroutes |
| P92.114–116 | UI button.N + 2s dedup | Cam #1948 ghost/double |
| P92.121 / 131 | Magic packet; battery wake read | First press; Peter “?” |
| P115 | markAppCommand | Ghost flows |
| P129/P135 | TS004F reinject guard | Publish bot stripped remotes |
| TS0041 door | Remove from contact | Smartbutton misroute |
| BOTH 0xFD | BoundCluster + skip 0x8004 | meter91 physical dead |
| P2235–44 | Family classify; sacred couples | Nobø / meter91 / Gabriel |
| P2249 | 0xFFDE + TS0043 locks | Zemismart/Moes + first press |
| **P2253/54** | Hybrid + profileSkip + docs | Close 5.x regression path |

Changelog echoes: TS004F reinject, ghost buttons, 3-btn routing, leftover EF00 on ZCL gangs, Green Power fake gang, battery unknown until report.

---

## Failure modes × users

| Mode | Users / diags | Fix status |
|------|---------------|------------|
| Wrong driver | meter91, Jocke, FrankP, Gabriel, TYZB01 walls | Locked couples + strip pids (P2249) |
| 0x8004 kills press | meter91 `55e3e591`, Nobø `9cbf9eb6` | Family + **profileSkip** (P2254) |
| No 0xFD | physical silent | BoundCluster + raw (shipped) |
| First press sleep | HA / Z2M class | Magic 0xFFDE (P2249) |
| FLOW-GUARD spam | Nobø | Declared-only / hashed resolve |
| Battery ? / spike | Peter SOS | Wake read + spike guard |
| Reverse order | Hubitat kkossev class | Setting on scene_switch_4 / bw3 |
| Couple ABSENT | Peter fleet | Wait BUTTON-WAKE — **do not invent** |
| Soft hypothesis | Steampunk xabckq1v+TS0001 | Rejected; lock **TS004F only** |

### Locked couples (do not invent)

| Couple | Driver |
|--------|--------|
| `_TZ3000_zgyzgdua`+TS0044 | `scene_switch_4` |
| `_TZ3000_wkai4ga5`+TS0044 | `scene_switch_4` |
| `_TZ3000_kfu8zapd`+TS0044 | `button_wireless_4` |
| `_TZ3000_xffhmvhv`+TS004F | `button_wireless_4` (no 0x8004) |
| `_TZ3000_xabckq1v`+TS004F | `button_wireless_4` |
| `_TZ3000_a7ouggvs` / `_TZ3400_key8kk7r` / `_TZ3000_bczr4e10`+TS0043 | `button_wireless_3` |
| `_TZ3000_lwthnp7j`+TS0004 | `wall_switch_4gang_1way` |
| `_TZ3000_4upl1fcj`+TS0041 | `button_wireless_1` |

---

## Why “5.x worked better”

Stable wrote **less** 0x8004 on wake for sleepy remotes. Master over-applied TS004F scene recovery → fixed P2244/P2249. Stable tip still only hard-skips mfr `xffhmvhv` in DeviceOperatingMode; master expands sacred mfrs + HomeyCompensationLayer TS004[1-4] magic-only.

Blue LED: pairing / leave-network blink only — **not** Homey backlight.

---

## Code changes this session (P2254)

- `PhysicalButtonMixin`: `skip8004` / `writeSceneAttr:false` **active** on init + wake
- `ButtonDevice`: remove stale “TS0044 needs 0x8004”; profileSkip gate
- Compose hints: `button_wireless_3`, `button_wireless_4`, `scene_switch_4` (honest scene / LED / TS004F-only write)
- Docs + gate `p2253-ts004x-hybrid-scene.test.js` (+ profileSkip assert)

## User ops (silent)

Update Test post-publish → **remove + re-pair** remotes still on wrong 1/2-gang. Peter: capture interview while pressing. No forum replies.
