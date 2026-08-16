# P172 — REFUSE “enrich-knowledge-base + bidirectional mfs sync + auto-PR” pack (2026-08-16)

## Verdict

**Do not create** `scripts/enrich-knowledge-base.js`, `scripts/sync-mfs-db.js` (bidirectional auto-fix), `.github/workflows/enrich-knowledge-base.yml`, `AI_BILLING_MODE` / `QuotaManager`, or `.cursorrules` “bidirectional enrichment + auto PR” rules.

## Why

| Pack claim | Reality |
|------------|---------|
| Scrape Z2M via GitHub Contents API → rewrite KB | Repo already has **silent** crawlers (`scripts/sync/crawl-z2m.js`, mega-crawl, Blakadder). Naive regex on 50 `.ts` files invents false workarounds (`battery.*delay` → spam). |
| Auto-PR to `develop` | Branches = **`master`** / **`stable-v5`**. Auto-PR bots refused (P159–P166). |
| `AI_BILLING_MODE` gate | Refused **P166**. |
| Bidirectional drivers ↔ mfs auto-mutate | Homey pairing = **static compose**. mfs→driver inject and regex “export” of `debounce` from `device.js` are noise / regression engines. Use **P169** aligner (registry → compose exclusivity → mfs). |
| `knowledge-base.json` path | Catalog is **`data/device-knowledge-base.json`** + **`data/error-patterns.json`** (P170). |
| Test on sample drivers “now” | Not this architecture. |

## Use instead

```bash
# Silent source crawl (existing)
node tools/ci/mega-crawler.js   # or scheduled mega-crawl.yml

# mfs align (correct direction)
node tools/ci/align-mfs-db-intelligent.js --check
node tools/ci/align-mfs-db-intelligent.js --apply

# Local diag KB (read-only)
node tools/ci/analyze-diag-locally.js --stdin
```

Human review before any compose/`--apply` that touches drivers. No auto-PR from Z2M scrape.

## Related refuses

P159–P166, P171 (mfs SSOT sync), P170 (accepted local KB only, no generate-fix).
