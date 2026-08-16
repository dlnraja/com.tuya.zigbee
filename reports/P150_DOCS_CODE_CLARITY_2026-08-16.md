# P150 — Documentation + code clarity from prior returns (2026-08-16)

## Why
Forum + prior prompts asked for clearer docs and less “AI / marketing” noise, while keeping real rules (sacred couple, dual-app, battery, buttons, OOM).

## Doc changes
| File | Change |
|------|--------|
| `CONTRIBUTING.md` (root) | Short pointer; drop emoji / Shadow Implementation hype |
| `.github/CONTRIBUTING.md` | De-hyped; misattribution registry + LiveData heap rule |
| `docs/CONTRIBUTING.md` | Align with GitHub guide + troubleshooting links |
| `docs/guides/USER_TROUBLESHOOTING.md` | **New** — wrong driver, duplicates, crash, battery, SOS |
| `lib/README.md` | Module map → layers (no “ultra-précise”) |
| `docs/architecture/LAYERS_…` | Cross-links |
| `reports/SESSION_HANDOFF_…` | Tip **9.0.541** Test |

## Code
| File | Change |
|------|--------|
| `BatteryMasterEngine.js` | Replace mojibake “ULTIMATE” banner + clean section comments |

## Not done
Rewriting every historical `docs/FORUM_*` archive; full lib tree rewrite.
