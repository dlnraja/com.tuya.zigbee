# Diag / crash / socket hang / build-failed — integral 2026-09-03 (P2406)

## Crash gate
`npm run check:gmail-crashes` → **verdict ok** (unknown=0). Known tip-soaked patterns only.

## Athom socket hang up / processing_failed (P139)
Soft-expect only — no republish spam.

## Build failed (CI) — closed this cycle
| Failure | Root | Fix | Status |
|---------|------|-----|--------|
| Syntax mfs high drift | P2405 registry vs mfs | align `--apply` + commit `3169c32dc` | master Syntax green |
| ja5osu5g\|TS004F collision | P2405 dual-claim | baseline + restore button_wireless_1 | BOTH |
| Stable validate missing soil OTA | master compose copy | strip soil firmwareUpdates | fixed earlier |
| Stable validate missing wall_dimmer OTA bin | master compose copy | strip wall_dimmer firmwareUpdates `233260eb6` | **Publish Stable SUCCESS** `33696313746` |

## Tips
| Track | Tip | Note |
|-------|-----|------|
| master | **9.0.806** | Auto-Publish after mfs sync |
| stable | **5.12.125** | Publish Stable to Test green after OTA strip |

## Dual-app
P2406 CI/mfs/OTA strip → **BOTH**. Never copy master `firmwareUpdates` onto Stable without assets.
