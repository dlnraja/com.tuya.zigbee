# P2354 — Forum multi-thread inspiration (silent)

**Policy:** SHADOW only — no Homey Community posts. Tip target after publish: master soak.

## Threads mined (inspiration → action)

| Thread | Signal | App improvement |
|--------|--------|-----------------|
| T150690 Steampunk | `_TZ3000_xabckq1v`+TS004F pairs as generic / weak clicks | **Force event mode** 0x8004 (was wrongly in TS0044 skip list) |
| T156967 Manfred | `_TZ300_kalzta4`+TS004F unknown | Typo alias → `_TZ3000_kaflzta4`+TS004F → `smart_knob` (already compose) |
| T156967 SunBeech/SergeP | Moes scene remotes wkai4ga5 / dfgbtub0 | Already locked (P2353); no invent TS0042 for wkai4ga5 |
| T150690 Primordial | DIY TS0044 0xFD kfu8zapd | Already `button_wireless_4` + PhysicalButtonMixin |
| T158757 Gabriel/A_Tas | mmWave settings save fails | Already soft-fail P2289/P2298 on 0xE002 |
| T140352 PresentSky | dimmer controls dead | Already P2314–P2350 |
| T140352 VicHY / meter91 / Salvagr | Unknown device | Sacred-keep exact case; user tip ≥9.0.744 |
| T154092 Zemismart curtains | cf1sl3tj / 68nvbio9 / m6lwazh9 | Already on `curtain_motor` |
| T157859 RF | coexistence education | Docs + `rf-channel-coexistence` already |

## Code shipped this pass

1. `lib/zigbee/DeviceOperatingMode.js` — `xabckq1v` → `ts004f` + `writeSceneAttr: true`
2. `tools/ci/forum-actionable-processor.js` — `FORUM_MFR_TYPO_ALIASES` kalzta4→kaflzta4
3. `config/architecture/publish-sacred-keep-couples.json` — pin xabckq1v + kaflzta4
4. Tests: `test/critical/device-operating-mode.test.js`
5. `docs/knowledge/PECULIARITIES.md` gap note

## Dual-app

**BOTH** — operating-mode + sacred-keep are reliability. Backport to stable after master soak.

## User actions (silent — no forum reply)

- Steampunk / TS004F Moes: update Test → remove → re-pair (event mode applied on init)
- Manfred: pair as Smart Knob / ERS-10TZBVB-AA (`_TZ3000_kaflzta4`+TS004F) — not invent `_TZ300_*`
- meter91 / VicHY / Salvagr: update ≥9.0.744 + re-pair correct driver
