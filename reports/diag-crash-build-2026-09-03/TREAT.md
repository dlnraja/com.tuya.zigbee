# Diag / crash / socket hang / build-failed — integral 2026-09-03 (P2406)

## Crash gate
`npm run check:gmail-crashes` → **verdict ok** (unknown=0). Known tip-soaked patterns only (FLOW-GUARD, IAS sleepy, DCM audit, heap, destroyed timers).

## Athom socket hang up / processing_failed (P139)
Transient Athom processor errors. Soft-expect + `processing-failure-republish-check` **must not** bump→republish loops. Tip Test builds after P2403–P2405 remain valid; wait cooldown if draft fails.

## Build failed (CI) this cycle
| Failure | Root | Fix |
|---------|------|-----|
| Syntax / mfs align high=9 | P2405 registry vs mfs_db lag | `align-mfs-db-intelligent --apply` |
| Fingerprint collision ja5osu5g\|TS004F | Cartesian dual after P2405 | Restore mfr on `button_wireless_1` + baseline intentional dual-claim |
| Stable publish missing OTA soil asset | Master soil compose copied | Restored Stable soil base + 0ints6wl only (prior push) |

## Homey app diags
Prior integral (P2403): DIY tuya_dp spam, cover cluster-miss, radar flood — tip ≥9.0.803+. GHA Gmail + Fetch Homey Diagnostics re-triggered this session.

## Dual-app
P2406 CI/mfs/baseline → **BOTH** where mfs/registry apply; crash gate MASTER_ONLY reports.
