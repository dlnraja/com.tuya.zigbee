# Deep functional enrich audit (P2529) — 2026-09-20

Silent only. **Never** forum POST. Complementary (P2520): union/append only.
**Not** mfr+pid-only — every row must cover DP / cluster / flow wire / RX-TX.

## Required vectors

- **identity** — Sacred couple mfr+pid (never invent pid)
- **driver_class** — Driver match vs interview / wrong-class UI
- **clusters** — Compose + interview clusters (EF00 61184, ZCL, IAS, raw 0xFD/0xFC)
- **dp_map** — EF00 DP map (cap vs capability ownership, divisors, settings)
- **rx_path** — RX: EF00 / ZCL / IAS / raw frame → capability commit
- **tx_path** — TX: settings + capability listeners → DP/ZCL write
- **flow_compose** — Flow cards declared in driver.flow.compose.json
- **flow_wire** — Flow cards wired (getDeviceTriggerCard / DeclaredFlowCardAutoWire / registerRunListener)
- **capabilities** — Capabilities vs phantom / staleCaps / mains battery
- **contre_quoi** — P2469 critical unit test locking the bug class

## Queue

| Source | ID | Couple / driver | Dual | Priority vectors | Action |
|--------|----|-----------------|------|------------------|--------|
| github | #550 | `_TZE204_gkfbdvyx`+`TS0601` → `presence_sensor_radar` | BOTH | flow_wire, dp_map, rx_path, tx_path, driver_class | depth-ok presence_sensor_radar: compose clusters=[0,61184]; device has DP/RX map path; device has flow wire hints — complementary only |
| github | #552 | `_TZ3000_e3vhyirx`+`TS130F` → `wall_curtain_switch` | BOTH | flow_wire, rx_path, driver_class | depth-ok wall_curtain_switch: compose clusters=[0,3,4,5,6,258]; WARN: no dpMappings/EF00 hints in device.js; flow cards=3 — complementary only |
| github | #551 | `_TZ3000_famkxci2`+`TS0043` → `button_wireless_3` | BOTH | flow_wire, dp_map, clusters, rx_path, driver_class | depth-ok button_wireless_3: compose clusters=[0,1,3,4,5,6,18,57344]; device has DP/RX map path; flow cards=21 — complementary only |
| forum | T158757 #10 | — | BOTH | flow_wire, rx_path, tx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T158757 #1 | — | MASTER_ONLY | driver_class | deep-functional: request-diag-couple |
| forum | T157859 #16 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T157859 #11 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T156967 #18 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T154092 #41 | — | BOTH | rx_path, flow_wire, dp_map | deep-functional-audit after couple lock (DP/cluster/flow/RX-TX) |
| forum | T154092 #37 | — | REVIEW | rx_path, flow_wire, dp_map | deep-functional-audit after couple lock (DP/cluster/flow/RX-TX) |
| forum | T154092 #19 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T154092 #18 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #34 | — | REVIEW | driver_class | deep-functional: request-diag-couple |
| forum | T150690 #33 | — | BOTH | flow_wire, clusters, rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #30 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #28 | — | BOTH | driver_class | deep-functional: request-diag-couple |
| forum | T150690 #12 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #11 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #10 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #5 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T150690 #1 | — | BOTH | driver_class | deep-functional-audit after couple lock (DP/cluster/flow/RX-TX) |
| forum | T146667 #15 | — | BOTH | flow_wire, rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T146667 #14 | — | BOTH | flow_wire, rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T146667 #10 | — | BOTH | driver_class | deep-functional: request-diag-couple |
| forum | T140352 #2239 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2238 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2237 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2234 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2233 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2230 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2228 | — | BOTH | clusters, rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2227 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T140352 #2208 | — | MASTER_ONLY | driver_class | deep-functional: request-diag-couple |
| forum | T140352 #2204 | — | REVIEW | driver_class | deep-functional: request-diag-couple |
| forum | T140352 #2199 | — | MASTER_ONLY | driver_class | deep-functional: request-diag-couple |
| forum | T140352 #1 | — | BOTH | flow_wire, rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T120477 #1 | — | REVIEW | driver_class | deep-functional: request-diag-couple |
| forum | T89271 #669 | — | REVIEW | driver_class | deep-functional: request-diag-couple |
| forum | T89271 #668 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T89271 #665 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T89271 #658 | — | BOTH | driver_class | deep-functional: request-diag-couple |
| forum | T89271 #657 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| forum | T89271 #656 | — | BOTH | rx_path, driver_class | deep-functional: code-fix-stable-candidate |
| gmail | gmail-diags | — | BOTH | rx_path, dp_map, flow_wire, contre_quoi | trace stack → driver RX/TX → Contre quoi test |

## Soft gates

- **gates**: ok (0ms)

## Doctrine

- SSOT: `config/architecture/deep-functional-enrich-ssot.json`
- Human: `docs/rules/DEEP_FUNCTIONAL_ENRICH.md`
- Gate: `npm run check:p2529`

