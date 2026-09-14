# Gmail + Homey diag treat — 2026-09-14 (silent)

Never forum POST. Never invent pid. Source: Cursor Gmail plugin (IDE) + forum harvest.

## Tip / Athom (from Homey mail)

| Build | Version | Mail |
|-------|---------|------|
| **#3186** | **9.0.926** | now testing (live tip) |
| #3185 | 9.0.924 | now testing (recovered after PF sibling) |
| #3184 | 9.0.924 | processing_failed socket hang up — P139 |
| #3183 | 9.0.922 | testing |

Stable: `#113` testing (`com.dlnraja.tuya.zigbee.stable`).

## Crash mails (Homey Pro)

| When | App | Homey | Stack | Treat |
|------|-----|-------|-------|-------|
| 2026-09-12 | **9.0.891** / **9.0.895** | Pro **2026** `homey7q` | `Driver Not Initialized: motionsensor` via serializer → `safeGetDriver` | **P2481** foreign-driver preempt — tip ≥9.0.902 (prefer ≥9.0.918). Tip-lag only. |
| 2026-09-01 | 9.0.746 | Early 2023 | crash mail | tip-lag / foreign ID class |
| 2026-08-31 | 9.0.730 / 9.0.743 | Early 2023 | crash mail | **P2351** foreign driver era |

## Diagnostics Report — Peter `a5304ce8` (2026-09-14 @ **9.0.916**)

- User: *App oké still no battery reading from Smartbutton*
- stderr: `capability_id_not_available_on_device` parsing `batteryPercentageRemaining: 76` on `button_wireless_1`
- Adapter hourly: marks `measure_battery` **stale** in cache; **To Remove: none** (P2488 keep) but cap already gone → ZCL paint fails
- Contact sensors OK; water_leak rejects 18%→100% spikes (good)
- SOS time sync soft-fail `utc is an unexpected property` (non-fatal)

**Fix complementary (P2490):** boot rehydrate + adapter queue `toAdd measure_battery` when keep-lock && !hasCapability.

## Other recent diag threads (already mapped)

| Date | Class | Linkage |
|------|-------|---------|
| Sep 11 | multi diags | Peter battery / crash tip-lag family |
| Sep 10 | diags | VicHY / curtain / presence class |
| Sep 6 | Peter 048cff91 | P2440/P2461 disco + battery |
| Sep 5 | Eduard/MIAMO era | curtain EF00 |
| Sep 2 | VicHY | clrdrnya connect / phantom |

## GitHub mail

- #547 HiepSVG radar @ 9.0.908 — gkfbdvyx sacred-keep **P2484** (already tip)

## Actions shipped this pass

1. Sacred-keep `icka1clh` / `zah67ekd` / `fodv6bkr` TZE200 (MIAMO Unknown after compact)
2. Peter battery rehydrate (device + adapter)
3. VicHY staleCaps curtain phantoms
4. Soft tip bump for P2490 publish
