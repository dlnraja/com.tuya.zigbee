# Latest inbox harvest — 2026-08-31 (~12:50 UTC+2)

Silent only. Tip on disk / git: **9.0.748**. No forum POST.

## Sources this pass

| Channel | Result |
|---------|--------|
| Gmail Homey **Diagnostics Report** | Thread Aug 29–31 (14 reports) + Aug 27 water/button |
| Gmail **crash** (3d) | None new (ZG9101 already P2351) |
| Forum silent multi-scan | 20 topics; 195 posts → 49 need-action |
| GitHub open issues | **#533** only (Salvagr Moes curtain) |
| UUID harvest | 16 UUIDs in `.github/state/inbox-diag-harvest/latest.json` |

## Diag → couple → verdict (tip already has fix)

| UUID | Ver on Homey | Symptom | Couple / driver | Verdict |
|------|--------------|---------|-----------------|---------|
| `60959c24` | 9.0.688 | PresentSky — dimmer OK, “none of controls work” | `_TZE284_m1cvyneb`+TS0601 → `wall_dimmer_tuya` | DP2→humidity DynCap + 2nd tile IEEE miss. **P2314–P2350** in tip. Update ≥**9.0.744** + remove/re-pair |
| `8c49c683` / `a095345e` | 9.0.678–699 | #532 AC / “Only ON Mode” | `wall_thermostat` FCU DP36 | DynCap poisoned setpoint; **P2300–P2333**. Confirmed OK `e3bf7ffc` @ **9.0.743** |
| `e3bf7ffc` | 9.0.743 | “Smart Thermostat working” | same | Closed loop ✓ |
| `c40705a1` | 9.0.714 | meter91 Moes 4-way not recognized | `_TZ3000_zgyzgdua` (+TS0044) → `scene_switch_4` | Locked + sacred-keep. Update ≥**9.0.738** + re-pair |
| `4217d5e3` | 9.0.719 | VicHY presence unknown | `_TZE204_clrdrnya`+TS0601 → `presence_sensor_radar` | Exact mfr in app.json. Update ≥**9.0.744** + re-pair |
| `7a6f2ca1` / `c137a5d7` / `e5d19878` / `a000e0a5` / `724d4bc9` | 9.0.714–741 | Salvagr Unknown / Zigbee Device (#533) | `_TZE204_5slehgeo`+TS0601 → `curtain_motor` | **P2348** exact case. Update ≥**9.0.744** + re-pair |
| `4b1a0dc9` | 9.0.669 | Water OK + Smartbutton no response | `_TZ3000_mrpevh8p`+TS0041 → `button_wireless_1` | Couple locked. Sleepy: press to wake; no RX on any protocol in window — mesh/re-pair, not missing FP |
| crash ZG9101 | 9.0.730/743 | `Invalid Driver ID: ZG9101SAC_HP` | foreign Hue ID in flow | **P2351** `safe-get-driver-patch` |

## app.json compact survival (verified @ 9.0.748)

- `curtain_motor`: exact `_TZE204_5slehgeo` ✓  
- `wall_dimmer_tuya`: exact `_TZE284_m1cvyneb` ✓  
- `scene_switch_4`: exact `_TZ3000_zgyzgdua` ✓  
- `presence_sensor_radar`: exact `_TZE204_clrdrnya` ✓  
- `button_wireless_1`: exact `_TZ3000_mrpevh8p` ✓  

## Forum (SHADOW)

Top live signals already mapped; no new FP invent:

- VicHY / clrdrnya → tip update + re-pair Presence Radar  
- meter91 / zgyzgdua+TS0044 → Scene Switch 4  
- PresentSky / m1cvyneb → tip + re-pair Wall Dimmer  
- SunBeech / SergeP remotes `wkai4ga5`+TS0044 locked; **do not** invent TS0042 for wkai4ga5  
- A_Tas `t9ynfz4x`+TS0225 soft → `motion_sensor_radar_mmwave` (already catalogued)  

## Code this harvest

**No new runtime patch required** — tip already carries P2333–P2353. Remaining user friction = stale Homey Test version / need re-pair.

## Dual-app

Prior reliability fixes = **BOTH** (already on master; P2353 stable backport in flight). This harvest = docs/report only (`MASTER_ONLY` report).
