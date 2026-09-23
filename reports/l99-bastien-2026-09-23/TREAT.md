# L99 TREAT — Bastien house — 2026-09-23

Silent only. Complementary P2699/P2700. No forum POST.

## Sources mined

| Source | Verdict |
|--------|---------|
| Gmail Athom | Bastien **#86 testing** (1.0.76 OK). Prior #82–#85 = P139 socket hang — soft-continue, do not spam republish |
| Gmail Universal | #3347 processing_failed socket hang; healthy Test tracks separate |
| External enrich | 48 candidates, **0 wouldApply** (saturated) |
| Button flow harvest 09-20 | No blocking issues |
| Mesh couples P2695 | Green — all live couples locked |
| House SSOT live | `axpdxqgu`+TS0041, `vsxvaj9i`+TS0043 (E000 complementary, no EF00), `ltt60asa`+TS0004 4gang |
| Dev dashboard (IDE browser) | Needs Athom login — Cursor browser ≠ Chrome cookies |
| WebBridge Chrome | Daemon **not running** on :10086 — cannot reuse session cookies this turn |
| LAN Homey box | Probe attempted (SSOT `192.168.1.15`) |

## Treated this pass

1. **P2673 / P2701** — `TuyaZigbeeDevice.initSmartManagers` applies `IntelligentEnergyAdapter` **before** `SmartEnergyManager` (was missing → gate red). Soft-fail OK.
2. Confirmed **P2699/P2700** already on Bastien tip 1.0.76 (non-native complementary soft-arm).
3. Live TS0043 `vsxvaj9i`: E000 in compose as complementary listen; `noEf00` / `noEf00Tx` / skip 0x8004 locked in device profile.

## Contre quoi

- `npm run check:p2673`
- `npm run check:p2699`
- `npm run check:p2695`

## Publish

Tip bump **1.0.77** — house intelligence energy adapter + L99 treat. Soft P139 if Athom hangs.
