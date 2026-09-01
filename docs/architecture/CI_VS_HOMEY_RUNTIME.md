# CI (GitHub Actions) vs Homey app runtime (P2228)

> **Rule:** What runs in workflows must not silently become Homey Pro bundle weight or crash paths. Homey = SDK3 local device logic only. CI = enrich / inventaire / Gmail / gates.

## Split

| Layer | Runs where | Examples |
|-------|------------|----------|
| **Homey app** | Homey Pro (SDK3) | `lib/tuya/*`, mixins, `HomeyGapCompensator`, `ButtonCaptureCascade`, `UnknownCaseRealigner` |
| **GitHub Actions** | ubuntu runners | `tools/ci/*`, `.github/workflows/*`, `config/enrichment/*`, `config/resilience/*` catalogs, `config/security/*` |
| **Source diff cache** | GHA + `.cache/*` | `intelligent-source-diff.js` — ETag + TTL + manifest; optional sources never block |
| **IDE / Cursor** | Maintainer machine | Gmail plugin L0, agent edits — never required on Homey |

## Homey package (`.homeyignore`)

**Excluded from Homey (CI-only):**

- `tools/`, `scripts/`, `.github/`, `docs/`, `reports/`, `test/`
- `config/enrichment/`, `config/resilience/`, `config/security/`
- CI enrichment modules: `PhaseRunner`, `EnrichmentRegistry`, `NeedActionInvestigator`, `ProfileSynchronizer`
- `data/user-impact-catalog.json`, `data/dp_couple_knowledge.json`

**Kept in Homey (runtime):**

| Path | Why |
|------|-----|
| `lib/resilience/HomeyGapCompensator.js` | Soft ensure on `onNodeInit` |
| `lib/mixins/ButtonCaptureCascade.js` | Physical button L5 E000 complement |
| `lib/resilience/data/button-capture-cascade.json` | Cascade SSOT for Homey |
| `lib/helpers/UnknownCaseRealigner.js` | Soft identity / DP observe |
| `lib/enrichment/HeuristicUnknownResolver.js` | Soft rank only (no CI registry) |
| `lib/helpers/data/heuristic-model.json` | Bundled heuristic defaults |

## Loader rule

Runtime loaders try **lib/\*\*/data/** first, then optional CI `config/**` (missing on Homey = OK). Never `require('tools/ci/...')` without try/catch + local fallback.

## Dual-app

Same split on **master** and **stable**. Never change App ID when porting. `dynamic_adaptation` density stays MASTER_ONLY; resilience soft hooks are BOTH.

## Commands

```bash
# CI only
npm run enrich:silent
npm run enrich:flow-fleet
npm run enrich:flow-fleet:apply
npm run source:diff
npm run source:diff:apply
npm run resilience:all
npm run ai:plan-guard
npm run workflow:smoke
npm run infra:cache-stats
npm run infra:log-smoke
npm run infra:sources
npm run flow:audit
npm run github:intel-respond

# Homey runtime is validated by device/driver tests, not by GHA catalogs
node --test test/critical/p2223-button-capture-cascade.test.js
node --test test/critical/p2183-boot-budget.test.js
```

## Intelligent infra (caches / logs / knowledge / memory)

SSOT: [`config/architecture/intelligent-infra.json`](../config/architecture/intelligent-infra.json) · verified sources: [`config/architecture/verified-sources.json`](../config/architecture/verified-sources.json).

| Concern | Canonical |
|---------|-----------|
| CI HTTP | `lib/scraper/smart-fetch.js` (not NetworkCache) |
| CI flow enrich | `tools/ci/flow-fleet-enrich.js` — orphan tokens, capability triggers, Z2M cross-ref |
| CI logs | `tools/ci/intelligent-logger.js` |
| Knowledge writes | `config/enrichment/manifest.json` → `knowledgeWriteTargets` |
| Homey memory | `BootBudget` + `lib/performance/IntelligentLazyLoad.js` — Buffer JSON, deferred heavy features |

### Memory / lazy (Homey ~64MB)

- **boot_light**: drivers start; no eager `mfs_db` / fingerprints giant parse
- **deferred_heavy**: ID refine, UDP, LiveData, flow feature modules (`app.js` `_scheduleDeferredMasterFeatures`)
- **on_demand**: `lazyRequire` / `whenHeapAllows` under pressure → skip
- **ci_only**: `.cache/*`, enrichment catalogs — never in Homey package

Big JSON: `JSON.parse(fs.readFileSync(path))` (Buffer). Never `'utf8'` on multi-MB files.
