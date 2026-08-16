# P161 — REFUSE auto-investigate / AI issue “fix proposals” (2026-08-16)

## Verdict
**Do not create `auto-investigate.yml` / `intelligent-triage.js` as proposed.**

## Why

| Idea | Problem |
|------|---------|
| Bot comments “proactive fix” from Z2M guess (DP1/DP2) | Invents mappings; pollutes issues; users think it’s verified |
| Push to `develop` in 24h | Tip uses **`master` / `stable-v5`**, not develop |
| FeatureFallbackRouter auto-cache new DP | Runtime self-mutation / MASTER_ONLY creep — not default |
| “Unified Engine” wording | Store name = **Universal Tuya** |
| Cross-search via `gh api` + invented HA links | Fragile; rate limits; often wrong model (mfr alone ≠ couple) |
| Close when “hardware proven” by bot | Humans close; stale = mark only |

## What we already do instead
- Silent multi-source crawl → dry-run apply → **human** review → `--apply` sacred couples  
- `data/user-misattribution-registry.json` + compose locks  
- Gmail/diag gates, forum **silent** (T157628)  
- Issue templates already require diag + mfr/pid when possible  
- Existing triage workflows — do not replace with AI paste bots  

## Answer to next steps
1. Finalize `intelligent-triage.js` with live web search? → **No**  
2. Run investigation on a specific model as demo report? → **Only** as a **human-requested** sacred-couple audit (report in `reports/`, no auto issue comments)

Keep: `docs/rules/PRAGMATIC_ROADMAP.md`
