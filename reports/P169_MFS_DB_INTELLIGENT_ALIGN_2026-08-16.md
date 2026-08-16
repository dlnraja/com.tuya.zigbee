# P169 — Intelligent automated mfs_db alignment (2026-08-16)

## Goal

Keep `data/mfs_db.json` continuously aligned with:

1. `data/user-misattribution-registry.json` (locks)
2. Exclusive `driver.compose.json` claims
3. Exclusive sacred couples `(mfr,pid)`
4. Case-key dedupe
5. Registry **forbiddenDrivers** → compose strip (anti bot re-inject)

## Tool

```bash
node tools/ci/align-mfs-db-intelligent.js           # dry-run
node tools/ci/align-mfs-db-intelligent.js --apply   # write mfs + compose strips
node tools/ci/align-mfs-db-intelligent.js --check   # CI fail on high-severity drift
```

### Priority order

| # | Source | Action |
|---|--------|--------|
| 0 | Registry forbiddenDrivers | Strip mfr from wrong compose |
| 1 | Registry canonical | Force `driverId` + `modelIds` (create if missing) |
| 2 | Compose exclusive mfr | Point mfs at the only real driver |
| 3 | Couple exclusive | Repair when curated doesn't own its modelIds |
| 4 | Case duplicates | Merge to preferred OEM key |

Ambiguous multi-driver / unclaimed orphans → **report only** (no auto-pick).

## First apply (this pass)

| Action | Count |
|--------|------:|
| compose_exclusive | 437 |
| couple_exclusive | 13 |
| case_dedupe | 9 |
| registry create/force | 6 |
| registry_compose_strip | 2 (jaap6jeb contact, qeuvnohg lcd) |

Idempotent after: `changes=0 high=0`. Skipped ~30 ambiguous (placeholders, multi light claims).

## Automation wiring

| Place | Mode |
|-------|------|
| `syntax-check.yml` | `--check` (blocks drift) |
| `self-improve.yml` | `--apply` after mfs-db-dedupe |
| `apply-class-scale-sacred-fixes.js` | delegates to this tool |

## Related

- Guard (report): `compose-mfsdb-class-guard.js`
- Dedupe: `mfs-db-dedupe.js`
- Registry audit: `audit-sacred-couple.js --from-registry`
