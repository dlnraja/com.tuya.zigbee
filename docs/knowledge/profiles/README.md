# Enrichment profiles

Auto-generated profile pages for **users** and **sacred couples (mfr+pid)**.

| Layer | Path | Role |
|-------|------|------|
| Manifest | `config/enrichment/manifest.json` | SSOT wiring |
| Phases | `config/enrichment/phases.json` | Pipeline blocks |
| Action model | `config/enrichment/models/action-model.json` | Verdict → user action |
| Issue model | `config/enrichment/models/issue-model.json` | Symptom → fix refs |
| User catalog | `data/user-impact-catalog.json` | Curated + auto stubs |
| DP couples | `data/dp_couple_knowledge.json` | DP semantics per couple |

Regenerate:

```bash
npm run enrich:sync
npm run enrich:profiles
npm run enrich:silent
```

See `INDEX.md` in this folder after first run.
