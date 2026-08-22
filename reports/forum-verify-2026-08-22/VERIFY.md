# Forum / PM / GH / couple verify — 2026-08-22

Silent only. No forum or PM replies.

## Channels checked

| Channel | Result |
|---------|--------|
| Forum 140352 | Highest still **#2190** (Peter). `last_posted_at` 2026-08-21. No #2191+ |
| Forum silent multi (18 topics) | Scanned; 5 “new FP” candidates → **4 polluted refused**, 1 pending verify |
| Forum PMs | Local secrets absent (`HOMEY_EMAIL` / `DISCOURSE_API_KEY`) — CI harvest only |
| GitHub issues open | **0** |
| GitHub PRs open | **0** |
| Gmail | Diags 55e3e591 / 0cea6870 / 9cbf9eb6 (already treated). Athom: master **build #2953 testing** (9.0.625). Stable drafts #13–15 `processing_failed` — **do not spam** |

## Sacred couples (mfr + pid) — internet cross-ref

| Couple | Sources | Driver | Verdict |
|--------|---------|--------|---------|
| `_TZ3000_zgyzgdua` + `TS0044` | forum #2189 meter91; Z2M #28224 Moes scene remote | `scene_switch_4` | **LOCKED** — update Test ≥9.0.619 + re-pair; 0xFD EP1–4 |
| `_TZ3000_xffhmvhv` + `TS004F` | Gmail 9cbf9eb6; Z2M SWS-IZ / herdsman #12768 | `button_wireless_4` | **LOCKED** — skip 0x8004; flow `*_4gang_button_*` |
| `_TZ3000_lwthnp7j` + `TS0004` | Gabriel #2186–2188; HomeSuite interview raw | `wall_switch_4gang_1way` | **LOCKED** — ZCL EP1–4 OnOff; pid was absent in forum text, confirmed via interview |
| `_TZ3000_k4ej3ww2` + `TS0207` | Z2M water IAS; not in Peter posts | `water_leak_sensor` | **LOCKED** — do not invent onto Peter tiles |
| `_TZE284_m1cvyneb` + `TS0601` | Z2M / P2138 | `wall_dimmer_tuya` | **LOCKED** — brightness 0–1000 |
| `_TZE200/204_pay2byax` + `TS0601` | P2201 | `contact_sensor_zigbee` only | **LOCKED** — no TS0601 on `contact_sensor` |
| `_TZ3000_V5498KDM` + `TS0001` | topic 99614 SergeP scrape | — | **NOT LOCKED** — no Z2M/Blakadder hit; refuse invent |

## Refused polluted “new FPs”

- `_TZE200_ABC123` + TS0601 (placeholder)
- `_TZ3000_CEHUW1L2` / `_H1JNZ6L` / `_OBORYB` + 30+ pids (Johan #26439 catalogue dump)

Scanner now filters these (`isPollutedNewFp` in `forum-silent-multi-scan.js`).

## User actions (no reply posted)

- meter91 / Nobø / Peter: install **Test 9.0.625** (#2953) + re-pair where driver/EP changed
- Stable Athom: wait cooldown after processing_failed; no republish loop

## Gates

- `p2138-sacred-couple-matrix-gate` PASS
- `anti-bot-regression-gate` PASS
- `github-security-elementary-gate` PASS
