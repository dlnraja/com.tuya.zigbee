# Local auto-improve — ALWAYS ON (P2542)

**Mandate:** Prefer **local heuristics** over any external AI / paid tokens. Crons and agents must auto-improve the fleet without remote LLM spend.

## Defaults
- `AI_FORCE_LOCAL=true` · `AI_ALLOW_REMOTE=false` · `AI_ALLOW_PAID=false` · `GMAIL_DIAG_AI_MAX=0`
- Orchestrator: `npm run improve:local` / `improve:local:quick`
- Gate: `npm run check:p2542` (+ `check:p2491`)
- SSOT: `config/architecture/local-auto-improve-ssot.json`
- Doc: `docs/architecture/LOCAL_AUTO_IMPROVE_SSOT.md`
- Homey runtime catalog: `lib/features/LocalSelfImproveCatalog.js` (zero cloud AI)

## Do
- Complementary enrich (P2520) + sacred couple locks
- `local-intelligent-solver`, mfs align, prune collisions, L99 dual gates
- Slim context via `project-smart-map.json`

## Don't
- Inject OpenAI/Grok/OpenRouter keys into cron steps
- Forum POST / AI paste (T157628)
- Invent productId
- Call remote AI from Homey Pro runtime
