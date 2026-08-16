# P171 — REFUSE “sync-mfs-db SSOT + QuotaManager + auto-PR” pack (2026-08-16)

## Verdict

**Do not implement** `scripts/sync-mfs-db.js`, `.github/workflows/sync-mfs-db.yml`, `AI_BILLING_MODE` / `QuotaManager`, auto-PR alignment, or a `.cursorrules` rule that forbids fingerprints in `driver.compose.json`.

## Why (Homey reality)

| Pack claim | Project truth |
|------------|---------------|
| `mfs_db` is absolute SSOT; drivers must not list FPs | Homey **pairs** via static `driver.compose.json` (`manufacturerName` × `productId`). Removing compose FPs **breaks pairing**. |
| Auto-fix rewrite `driver.json` from mfs | Drivers use `driver.compose.json` (SDK3). Blind mfs→compose inject is how dual-claims / wrong class bugs return. |
| Cron auto-PR to `develop` | Branches are **`master`** / **`stable-v5`**. Auto-PR bots refused (P159–P166). |
| `AI_BILLING_MODE` + quota gate | Refused P166 — no financial kill-switch architecture for invented AI workflows. |
| Compare to `knowledge-base.json` | Catalog is `data/device-knowledge-base.json` + `data/error-patterns.json` (P170), not that path. |
| Orphan = driver folder without mfs key | mfs is keyed by **mfr**, not driver folder id. Pack’s `mfsDb.devices[dir]` model is wrong for this repo. |

## Already shipped (use this)

```bash
node tools/ci/align-mfs-db-intelligent.js --check   # CI
node tools/ci/align-mfs-db-intelligent.js --apply   # registry → compose strips + mfs align
node tools/ci/compose-mfsdb-class-guard.js
node tools/ci/mfs-db-dedupe.js --check
node tools/ci/audit-sacred-couple.js --from-registry
```

Priority in P169 aligner (correct direction):

1. **Registry** locks (highest)
2. Exclusive **compose** claim
3. Exclusive **sacred couple**
4. Case dedupe  
Ambiguous → report only (no auto-pick / no auto-PR).

CI: `syntax-check.yml` runs `--check`. `self-improve.yml` may `--apply`.

Docs: `reports/P169_MFS_DB_INTELLIGENT_ALIGN_2026-08-16.md` · local KB P170 (not `knowledge-base.json`).

## Dual-app

| Track | Rule |
|-------|------|
| `master` | static compose + capped dynamic overlays |
| `stable-v5` | static reliability only after soak |

Never “mfs owns Homey pairing manifests.”

## Explicit non-goals

- FeatureFallbackRouter / Homey runtime reading full mfs_db into settings (OOM class — P148)
- Mass auto-PR chore branches
- Overwrite `.cursorrules` with OPUS SSOT packs
