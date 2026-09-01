# Intelligent Source Diff (P2376)

> **Rule:** External sources are optional unless marked `blockPipeline: true`. Cache-first, diff-only fetch. Never re-download the whole internet on every cron.

## Problem

Fleet / enrich workflows touch 15+ external sources (Z2M, ZHA, Blakadder, forum, Gmail, Johan GitHub…). Naïve cron = rate limits, lockouts, wasted CI minutes, and **full pipeline failure** when one secret is missing.

## Solution — three layers

| Layer | Where | What |
|-------|--------|------|
| **HTTP diff** | `lib/scraper/smart-fetch.js` | ETag / If-None-Match → HTTP 304, per-host metrics |
| **Scanner TTL** | `scripts/scanners/scanner-cache.js` | SHA-256 + TTL per source (12h–7d) |
| **Source manifest** | `tools/ci/intelligent-source-diff.js` | Project fingerprint + per-source stale/missing plan |

Machine SSOT: [`config/enrichment/source-registry.json`](../../config/enrichment/source-registry.json)

Manifest (gitignored state): `.github/state/intelligent-source-manifest.json`

GHA cache paths: `.cache/scraper-cache/`, `.cache/scanner-blobs/`, `.cache/scanners/`, manifest

## Behaviour

1. **Plan** (`node tools/ci/intelligent-source-diff.js`) — lists skip-fresh / crawl-stale / skip-unavailable per source.
2. **Apply** (`--apply`) — runs crawls **only** for stale/missing/forced sources; optional sources **soft-fail** (`exit 0`).
3. **Project fingerprint** — SHA of all `(mfr,pid)` in `driver.compose.json`. When it changes → cross-ref re-run only (no full Z2M storm).
4. **Secrets missing** — Gmail/forum/Johan skipped; pipeline continues with stale cache + local cross-ref.

## Never block

- `optional: true` + `blockPipeline: false` on all external tiers in registry.
- Orchestrators use `soft: true` / `|| true` on optional phases.
- Hard gates remain: sacred couple matrix, anti-bot, flow-l99 — **local repo only**.

## Commands

```bash
npm run source:diff          # plan
npm run source:diff:apply    # crawl stale only (soft fail)
npm run infra:cache-stats    # aggregate .cache/*
npm run scrape:budget:preflight
```

## Workflows wired

- `fleet-intelligent-enrich.yml` — restore intel cache → source diff plan → fleet enrich
- `auto-enrich-closed-loop.yml` — shared cache restore-keys
- `fleet-intelligent-enrich.js` — `--crawl` uses `intelligent-source-diff --apply` instead of 7 parallel crawls

## Homey Pro

**None of this runs on the box.** CI-only per [`CI_VS_HOMEY_RUNTIME.md`](CI_VS_HOMEY_RUNTIME.md).
