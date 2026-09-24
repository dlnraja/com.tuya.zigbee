# Bastien diags 1f4dcf2e + e1654535 — P2714

Silent treat. No forum POST.

## Couples
| Couple | Driver | Notes |
|--------|--------|-------|
| `_TZ3000_dzwgk7e2`+`TS0042` | `button_wireless_2` | sticky 2-btn |
| `_TZ3000_vsxvaj9i`+`TS0043` | `button_wireless_3` | sticky 3-btn |
| TS0041 (axpdxqgu class) | `button_wireless_1` | user OK @ 1.0.80 |

## Root cause (e1654535 @ 1.0.80)
1. Class fallback used **debounce 80** + default **appWindow ~1000** until late MFR-ENSURE → TS0042/43 slower than TS0041
2. Bootstrap seed called `_isDebounced` first → burned window → next press skipped
3. `Invalid Capability: measure_battery` after strip race + CPU warning

## Fix P2714 (BOTH)
- Snappy driver/class fallback (180/25 + snappyRelayFlow) even with empty mfr/pid
- Bootstrap seed **before** debounce (ZCL + DP)
- Soft-ignore Invalid Capability; rehydrate battery on bw2/bw3
- bw2 appWindow aligned to 180 (TS0041 floor)

## Tips
| App | Tip |
|-----|-----|
| Bastien | **1.0.89** |
| Universal | **9.0.1223** |

User: update Bastien Test → Repair remotes (press once after Repair).
