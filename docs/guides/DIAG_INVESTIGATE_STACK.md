# Diagnostic investigation stack

Silent enrichment only — never auto-posts to Homey Community.

## Orchestrator

```bash
npm run diag:self-test          # inventory + syntax smoke all diag JS/YAML
npm run diag:scrape             # free-scrape cascade only
npm run diag:investigate        # scrape + polarity hints (no Homey fetch)
npm run diag:fetch-hints        # fetch UUIDs from .github/state/free-scrape/diag-hints.json
```

Or directly:

```bash
node scripts/ci/diag-investigate-orchestrator.js --self-test
node scripts/ci/diag-investigate-orchestrator.js --full --focus=2137 --skip-fetch
node scripts/ci/diag-investigate-orchestrator.js --fetch-diags --uuid=<uuid>
```

## Cascade ($0 first)

Same as [FREE_SCRAPE_STACK.md](./FREE_SCRAPE_STACK.md): direct → Jina → Microlink → AllOrigins → Crawl4AI → Wayback → Firecrawl budget → browser.

Outputs (gitignored):

| Path | Content |
|------|---------|
| `.github/state/free-scrape/crossref-report.json` | sources, sacred couples, polarity |
| `.github/state/free-scrape/diag-hints.json` | harvested Homey diag UUIDs |
| `.github/state/free-scrape/polarity-hints.json` | AlarmPolarityManager list hits |
| `.github/state/homey-app-diag/<uuid>.*` | fetched crash/diag artifacts |
| `.github/state/diag-orchestrator/last-run.json` | orchestrator summary |
| `.github/state/diag-orchestrator/self-test.json` | script inventory smoke |

## Per-UUID tools

```bash
node scripts/ci/fetch-homey-app-diag-by-uuid.js <uuid>
node scripts/ci/scan-homey-crashes-for-uuid.js <uuid> [--puppeteer]
node scripts/ci/gmail-search-diag-uuid.js <uuid>
```

Needs `HOMEY_REFRESH_TOKEN` / `HOMEY_PAT` and optionally Gmail secrets.

## Workflows

| Workflow | Role |
|----------|------|
| `free-scrape-crossref.yml` | cron 02:45 + dispatch; optional `fetch_diags` |
| `tuya-deep-diag.yml` | deep recovery: scrape → UUID fetch → Gmail → Athom |
| `gmail-diagnostics.yml` | Gmail crash harvest |
| `collect-diagnostics.yml` | device/collect scripts |

## Polarity

See [ALARM_POLARITY.md](./ALARM_POLARITY.md). Free scrape attaches `polarityHints` when SOS/contact/water keywords appear.
