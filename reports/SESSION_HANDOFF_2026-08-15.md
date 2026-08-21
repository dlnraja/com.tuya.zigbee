# SESSION HANDOFF — 2026-08-22 (dual App IDs + forum #2190)

> Forum silent. No invent pid. No CloudAgent. Stable P139 = no Athom republish spam.

## Live truth

| Track | App ID | Git tip | Store |
|-------|--------|---------|-------|
| master | `com.dlnraja.tuya.zigbee` | **9.0.620** `3d9553ae0` | Test OK (update + re-pair) |
| stable-v5 | `com.dlnraja.tuya.zigbee.stable` | **5.12.88** `531c103cb` | Draft #13 processing_failed |

## Forum (highest #2190)
- Peter #2190: contact pulse / water+smartbutton dead / SOS OK — **no mfr in post**. Diag `0cea6870`.
- meter91 #2189: `zgyzgdua`+TS0044 — needs Test ≥ 9.0.619 + re-pair for 0xFD.

## In git (already published on master Auto-Publish)
skip leftover EF00 IAS · 0xFD mixin · zoneStatus coerce · hashed flows · IR aliases · P2203 bind

## Open (do not invent)
- Peter SOS battery glitchy / contact lux plateau — no couple in post → wait dump
- Stable: strip leftover mfr-as-pid on water (local fix) — **push Stable only after P139 cooldown**
- Empty-mfr catch-alls (18) — strip carefully (zero FP otherwise)

## Do not
Forum reply · invent pid from compose onto Peter · republish Stable tonight · use stale `stable-v5-p195`
