# P159 — REFUSE “enrichissement bidirectionnel total” pack (2026-08-16)

## Verdict
**Do not create / paste / deploy this plan.** It duplicates the repo, invents a greenfield tree, and reintroduces unsafe automation we already rejected (P147 / P157 / P158).

## Already exists (do not recreate)

| Pack asks for | Tip reality |
|---------------|-------------|
| `data/mfs_db.json` | Exists (~7MB, `.homeyignore`) |
| `.cursorrules` | Exists |
| CI / stale / collect / crawl | Dozens of workflows under `.github/workflows/` |
| Apply FPs / sacred couples | `tools/ci/apply-*.js`, `audit-sacred-couple.js`, registry |
| Heap size gate | `tools/ci/homey-heap-json-gate.js` (smart) wired in syntax + auto-publish |
| LiveData OOM + sleepy DP | P148 in tip **9.0.543+** |
| Forum / Gmail collect | `forum-silent-multi-scan`, `gmail-diagnostics` (silent) |

## Explicit refusals

| Proposal | Why |
|----------|-----|
| `sync-mfs-db.js` Mode 1: **generate drivers** from mfs | Homey pairing = compose sacred couples; AI driver skeletons = slop |
| `device-template.js` auto Homey.Driver | Same as refused `generate-patch` / Z2M→driver |
| `memory-check.yml` fail all JSON > 2MB | Breaks on ignored large DBs; use existing smart gate |
| `auto-investigate.yml` / `auto-patch.yml` AI PR | Unsafe merges; no Homey-impossible substitution |
| New `.cursorrules` overwrite | Keep current project rules |
| `AI_BILLING_MODE=SUBSCRIPTION` kill-switch as architecture | Not our security model; don’t invent billing gates in Actions |
| Recreate `knowledge-base.json` from scratch | Use existing docs/reports/registry — don’t invent parallel DB |

## Keep doing instead
1. Sacred couples + misattribution registry + dual-claim triage  
2. Layer passes (energy / buttons / flows)  
3. Existing crawlers dry-run → human review → `--apply`  
4. Peter soak on Test ≥ 9.0.541  
5. Silent forum enrichment (T157628)

**Answer to “générer le contenu complet de chaque fichier ?” → No.**
