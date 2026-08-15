# Free Scrape Stack (keyless-first)

Autonomous multi-source harvest for Universal Tuya Zigbee — **$0 by default**.

## Cascade order

| # | Backend | Cost | When |
|---|---------|------|------|
| 1 | Direct HTTP (Discourse / GitHub JSON) | Free | Always first |
| 2 | [Jina Reader](https://r.jina.ai/) | Free, keyless | Origin blocked / HTML |
| 3 | [Microlink](https://api.microlink.io) | Free tier | Jina fails |
| 4 | AllOrigins | Free | CORS / soft blocks |
| 5 | Crawl4AI self-host | Free if you host | `CRAWL4AI_URL` set |
| 6 | Wayback CDX | Free | Historical pages |
| 7 | Firecrawl API | Free credits, **capped** | `FIRECRAWL_API_KEY` + `FIRECRAWL_DAILY_MAX` (default 5/day) |
| 8 | Playwright / Puppeteer | Free local | `FREE_SCRAPE_BROWSER=1` + package installed |

ScrapeGraphAI / browser-use paid SaaS are **not** required — `structuredExtract()` does heuristic sacred-couple / diag / issue mining for $0.

## Run locally

```bash
node tools/ci/free-scrape-crossref.js --topic=140352 --focus=2134
node tools/ci/mega-crawler.js --only=free-scrape
```

Outputs (gitignored under `.github/state/`):

- `free-scrape/crossref-report.json` — sources, merged extracts, `sacredCouples` routing
- `free-scrape/dashboard-snippet.json`
- `free-scrape/diag-hints.json` — UUIDs for `scripts/ci/fetch-homey-app-diag-by-uuid.js`

`structuredExtract()` never classifies `TS####` as manufacturers (sacred-couple mfr ≠ pid).

## GitHub Actions

Workflow: `.github/workflows/free-scrape-crossref.yml`

- Cron `45 2 * * *` (after mega-crawl)
- Optional secrets: `FIRECRAWL_API_KEY`, `CRAWL4AI_URL`
- Uploads artifact only (no forum posts, no commit of private state)

## Env

```bash
SMART_FETCH_READER_FALLBACK=1   # keep readers on (default)
FREE_SCRAPE_SKIP=microlink      # skip named tiers
CRAWL4AI_URL=http://localhost:11235
FIRECRAWL_API_KEY=...
FIRECRAWL_DAILY_MAX=5
FREE_SCRAPE_BROWSER=1           # allow local browser
```

## Policy

Silent enrichment only — **never** auto-post to Homey Community (T157628).
