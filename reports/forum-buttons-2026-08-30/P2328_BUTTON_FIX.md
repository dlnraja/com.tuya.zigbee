# Forum button dump + P2328 fixes (2026-08-30)

Silent scan only (T157628). No forum replies.

## Dump
- `forum-silent-multi-scan` — 22 topics, 0 new FPs
- Button hits: `reports/forum-buttons-2026-08-30/LATEST_BUTTON_POSTS.json` (40 latest / 138 total)
- Processor: 51 need-action; top button couples: `wkai4ga5`+TS0044, `zgyzgdua`+TS0044, `kfu8zapd`+TS0044

## Latest button-relevant posts
| When | Post | User | Signal |
|------|------|------|--------|
| 08-30 | T140352 #2207 | meter91 | button / unknown |
| 08-30 | T158757 #10 | Gabriel | dimmer/gang/button/flow |
| 08-26 | T156967 #56 | Manfred | button |
| 08-21 | T140352 #2189 | meter91 | `_TZ3000_zgyzgdua`+TS0044 |
| 08-21 | T140352 #2190 | Peter | SOS / smartbutton |

## Root causes fixed (BOTH)
1. **MVM** — `_TZ3000_wkai4ga5` removed from TS004F `0x8004` list; TS0044 path sets `sceneModeAttribute=null`
2. **resolveDriverType** — couple-aware (meter91/Moes → `scene_switch_4`, kfu → `button_wireless_4`)
3. **button_wireless_4** — `wrapHandleFrame` instead of blind `handleFrame=` (orphan / double-fire)
4. **scene_switch_4** — skip raw 0xFD when BoundCluster already armed
5. **wall_switch_4_gang** — strip TS0044 + remote mfrs (ufhtxr59/vp6clf9d/abci1hiu)
6. **scene_switch_4 compose** — productIds `TS0044`+`TS1002` only; no HOBEIAN bare / knob soup
7. **mfs_db + misattribution** — wkai/kfu battery remote locks; forbid wall_switch steal

## Verify
`mocha test/critical/p2328-button-forum-rx.test.js` + `p2249` — 13 passing

## User action (silent)
Update Test tip + **re-pair** remotes that landed on wall_switch / knob / wrong driver.
