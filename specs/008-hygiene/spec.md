# Spec 008: Repo/CI hygiene
- stable-v5 version mismatch (app.json 5.12.355 vs .homeycompose/app.json 5.12.356) → align.
- stable-v5 Syntax Check failure (2026-09-28) → fix.
- master Auto-Publish `check:p248x` failure → fix.
- app.json size (4,180,221 B) — stay < 4 MiB, plan trimming; PR #555 `.ai/` caches (~16 MB) out of git.
- External PRs merged with enrichment mindset (M5); fork PRs must have PR Gate run before merge.
