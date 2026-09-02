# Forum + Homey UI bidirectional treat — 2026-09-02 (P2397)

Silent only. Tip soak: **Universal Tuya Test ≥ 9.0.796**.

## Forum (latest silent scan)

- Topics scanned (multi-silent): 140352 highest **#2226**, actionable fleet refreshed
- Processor: 215 posts · 48 need-action (mostly tip soak / softHypothesis)
- No forum POST / PM

| Signal | Couple / note | Treat |
|--------|---------------|--------|
| Gabriel wall multi-gang | `_TZ3000_lwthnp7j` → `wall_switch_4gang_1way` | Tip + P2397 UI↔EP |
| SunBeech / Graeme buttons | TS004x locked | Cascade L7 skip + bidirectional pulse |
| VicHY radar→curtain | `_TZE204_clrdrnya`+TS0601 | Already P2379/P2391 tip |
| meter91 unknown TS0044 | `_TZ3000_zgyzgdua`+TS0044 | Update + re-pair scene_switch_4 |
| Cam smart button | NEED_INTERVIEW | Soft only — never invent pid |
| #536 fan Marcelo | `_TZE200_r32ctezx`+TS0601 | P2396 tip ≥9.0.795 |

## Root UI/UX gap (P2397)

Legacy thin drivers expose Homey **button.N** maintenance tiles but:
- `gangCount` stayed **1**
- no **onoff.gangN** on multi-cap parents
- Homey **zigbee.devices** parents must not get duplicate onoff.gangN (child tile owns onoff)

→ UI Button 2 was a no-op for many multi-gang tiles.

## Fix (BOTH)

| Piece | Change |
|-------|--------|
| `BidirectionalButtonState` | `countCapabilitiesGangHint` + resolveGangCount includes caps |
| `ensureGangUiCapabilities` | soft-add button.N / onoff.gangN; skip onoff.gangN on subdevice parents |
| `VirtualButtonMixin` | EP-only TX when no gang cap; prefer `_setGangOnOff` |
| `TuyaZigbeeDevice` / `UnifiedSwitchBase` | ensure before listeners; VBM even without gangCap |
| `NamedButtonFallback` | `onoff.N` + EP TX fallback |
| `PhysicalButtonMixin` | pulse `button.N` on physical press |
| `HomeyGapCompensator` | gang-ui soft-ensure |

## Verify

```
node --test test/critical/p2397-gang-ui-bidirectional.test.js test/critical/p2220-button-ui-ux.test.js test/critical/p2283-bidirectional-buttons-permanent.test.js
```

20/20 pass.
