# User profile — SteampunkLolcat

Forum topics: **T150690** · Posts: 28, 30 · also T140352 history

## Devices

| Tile | Driver | Couple | Confidence | User action |
|------|--------|--------|------------|-------------|
| 4-button wireless | `button_wireless_4` | `_TZ3000_xabckq1v`+`TS004F` | **LOCKED** Z2M | Update Test ≥9.0.792; scene/event mode; P2236 force TS004F path |

## Hard rejects

- Soft hyp `xabckq1v`+`01MINIZB` / `TS0001` — **REJECT** (never invent; known couple is TS004F only).
- Driver compose may list other productIds for *other* mfrs — does not authorize gluing them onto xabckq1v.

## Notes

- P2236 / DeviceOperatingMode: force `ts004f` + writeSceneAttr for this mfr.
- Silent enrich only (T157628).

---
Regenerate: `npm run enrich:sync` + `npm run enrich:profiles`
