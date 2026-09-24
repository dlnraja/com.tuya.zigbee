# Bastien diag 27b0bd04 + Instagram — P2718 OOM

Silent treat. No forum POST. Instagram DMs/vocaux: WebBridge had no IG session this turn — Gmail diags are SSOT.

## Timeline
| When | Tip | Log | User |
|------|-----|-----|------|
| 23 Sep 15:36Z | 1.0.76 | `1f4dcf2e` | TS0042 latency; TS0041/43 unknown |
| 23 Sep 22:09Z | 1.0.80 | `e1654535` | TS0041 OK; TS0042/43 trop lent |
| **24 Sep 06:56Z** | **1.0.82** | **`27b0bd04`** | **Aucun des 3 boutons ne fonctionne** |

## Root cause (27b0bd04)
1. Presses **do** RX (`0xFD` + `triggerButtonPress snappy`) then app **heap OOM → SIGABRT**.
2. LIVE-DATA merged ~1500 segment rows **without modelIds** → `_validatePayload` rejected **after** RAM spent.
3. `getDeviceProfile` called 8+/press with log+spread → CPU/heap storm under Homey 64MB.
4. Tip-lag: Bastien still on **1.0.82**; tip was already ≥1.0.89 (P2714 latency) but OOM path remained.

## Fix P2718 (BOTH + Bastien)
- LiveDataUpdater: couple-only merge (`modelIds` required), MAX_ENTRIES 800, MAX_SEGMENTS 6
- Bastien app id: **skip OTA overlay entirely**
- PhysicalButtonMixin: cache profile + log-once; invalidate on MFR-ENSURE

## Tips
| App | Tip |
|-----|-----|
| Bastien | **1.0.91** |
| Universal | **9.0.1229** |
| Stable | **5.12.329** |

## User
1. Update **Zigbee Bastien** Test → ≥**1.0.91**
2. Restart app (or reboot Homey) once after update
3. Press TS0041/42/43 once — Flow → relais
4. If Settings still blanc: already fixed P2717 (≥1.0.90)

Instagram: if Bastien sent new vocaux after this diag, forward UUID / re-send diag — no IG access from agent this turn.
