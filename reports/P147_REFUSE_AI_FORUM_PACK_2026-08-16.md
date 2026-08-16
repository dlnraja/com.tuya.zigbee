# P147 — Refuse AI forum pack + keep execution lane (2026-08-16)

## Do NOT automate / publish
- Forum roadmap post (“Unified Engine”, auto driver substitution, weekly updates) — **T157628**, wrong product name, overpromises Homey cannot do.
- Python `generate_driver` / auto-publish Homey Store — unsafe AI slop; Homey pairing is **compose sacred couples**, not generated skeletons.
- Replacing existing `.github/CONTRIBUTING.md` + issue/PR templates with the naive drafts.

## Already in place (use these)
| Area | Canonical |
|------|-----------|
| Battery % / anti-flood | `BatteryMasterEngine` |
| Virtual / physical buttons | `VirtualButtonMixin` (300ms) + `PhysicalButtonMixin` (debounce) |
| Misattribution | `data/user-misattribution-registry.json` + matcher force |
| Docs layers | `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md` |
| Contribute | `.github/CONTRIBUTING.md`, issue templates, PR template |

## Publish fix (same day)
- Auto-Publish failed after upload: `Invalid Parameter Type: buildId. Got: number. Expected: string`
- Fix: coerce `buildId` to `String(...)` in `scripts/direct-api-publish.js` (`pollBuildState` / `setChannel` / createBuild result).
- Do **not** spam republish while Athom still has `waiting_for_files` / prior `processing_failed` (P139).

## Execution lane (this week)
1. Land buildId string fix → one Auto-Publish cycle.
2. Peter crash soak (`96c19859…`) after tip shows new build.
3. Incremental sacred-couple + energy/button harden — one module at a time.
4. Optional: short **human** English forum note later — never paste the AI pack.
