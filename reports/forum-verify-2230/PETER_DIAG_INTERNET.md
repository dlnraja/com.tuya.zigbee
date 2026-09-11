# Peter #2230 deep cross-ref — diag + internet (P2461)

Generated: 2026-09-11 · Silent enrich only (T157628)

## Locked couple

| Field | Value |
|-------|-------|
| manufacturerName | `_TZ3000_mrpevh8p` |
| productId | `TS0041` |
| Driver | `button_wireless_1` |
| Retail | Tuya SH-SC07 / RSH-SC021 |
| Battery | CR2450 (Z2M PR / whiteLabel) |
| App in diag | **9.0.836** (before P2440 @ 9.0.850 / P2461) |

## Diag `048cff91` evidence (Peter Smartbutton)

| Log line | Meaning |
|----------|---------|
| `mfr=_TZ3000_mrpevh8p pid=ABSENT` | Couple known mfr; modelId settings blank |
| `cmd=0xfd` → `single` then **~3.4s later** second `0xfd` | Firmware retransmit → second flow burst (disco) |
| `FLOW-GUARD` ×21 invent IDs (`*_button_pressed`, UPPERCASE, `*_button_1_pressed`) | Speculative cards next to real `*_1gang_*` + `button_matrix` |
| `Using stored battery: 100%` then `THROTTLE … duplicate_value` | Store OK, Homey UI stayed `?` |
| `Tuya DP… dp is an unexpected property` | No EF00 — dataQuery wastes awake window |
| `Failed to re-configure powerConfiguration: attribute Does not exist` | Matches Z2M #8072 anti-pattern |
| `P2316 skip wake 0x8004 (family=ts0044)` | Mislabelled family (pid ABSENT); skip-8004 itself correct |

Forum screenshots (`reports/forum-media-2230/`): tile battery `?`, Insights empty, app tip **9.0.836**.

## Diag `cfbf687f` (prior, 9.0.779)

- Same mfr; `button_matrix` fires; **0** `1gang` card fires → P2378/P2381 flow declare path.

## Internet / Z2M / Johan (max search)

| Source | Finding |
|--------|---------|
| [Z2M SH-SC07](https://www.zigbee2mqtt.io/devices/SH-SC07.html) | Exposes `battery` + `action` = single/double/hold; battery **not /get**; up to 24h passive |
| [ZHC PR #6225](https://github.com/Koenkk/zigbee-herdsman-converters/pull/6225) | Fingerprint `_TZ3000_mrpevh8p` → SH-SC07; siblings `5bpeda8u`, `b4awzgct` |
| ZHC `tuya.ts` TS0041 | **Removed** `reporting.batteryPercentageRemaining` — [Z2M #8072](https://github.com/Koenkk/zigbee2mqtt/issues/8072): hourly drop, LED flash, short life, **2 presses** |
| [Johan #1120](https://github.com/JohanBendz/com.tuya.zigbee/issues/1120) | RSH-SC021 interview EP1 clusters `1,6,E000,0` — **no EF00**; phantom EP2–4 |
| Z2M #21143 / #21301 | Action prefix `1_single` regression — confirms 1-btn mapped as multi-EP (our mapAllEndpointsToButton1) |

## P2461 fixes mapped to evidence

1. `crossPathDedupMs=4000` → covers 3.4s retransmit  
2. Compose-only 1gang + `tryOnce` → kills FLOW-GUARD invent spray  
3. Store-first + `skipThrottle` when UI null → leave `?`  
4. Skip EF00 battery query + announce DP blast (`noEf00Tx`)  
5. Skip powerConfiguration reporting reconfigure on wake (Z2M #8072)  
6. Soft-fill `zb_model_id=TS0041`; family log `ts0041` not `ts0044`  
7. Battery chemistry lock CR2450 for SH-SC07 mfrs  

## Dual-app

**BOTH** (reliability). User: update Test tip after publish; press Smartbutton once.

## Do not invent

Other Peter tiles (SOS / Raam / Water) in #2230 screenshots stay **ABSENT** couples until interview.
