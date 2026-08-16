# P160 — REFUSE “plan architectural exhaustif OPUS” pack (2026-08-16)

## Verdict
**Do not execute this pack as written.** Parts restate real goals; most reinvent branches, close issues aggressively, shard the wrong file, or re-propose refused CI.

## Map: proposal → tip reality

| Proposal | Reality |
|----------|---------|
| `homey app validate` in CI | Already in `syntax-check.yml` (+ other gates) |
| JSON > 2MB fail on `/data` | **Refuse naive** — use `homey-heap-json-gate.js` (wired). Large `mfs_db` is `.homeyignore` |
| New `stale.yml` + auto-close no-diag in 7d | Stale exists; **mark only, never auto-close** (AGENTS.md) |
| Smart PR commenter | Optional later; we already have pre-commit / publish / security gates |
| Shard `fingerprints.json` 11MB | Tip `data/fingerprints.json` is **tiny**; OOM was **LiveData Pages overlay** (P148) |
| Wipe all `_hybrid` folders | Many are **deprecated sentinels** (P142) — don’t mass-rename |
| GC `setTimeout(10)` between loops | Prefer `safeSetTimeout`; don’t spray arbitrary yields |
| Replace all logs with LogBuffer | Out of scope / risk; keep quiet expected sleepy timeouts |
| Mesh LQI Homey notifications | Feature creep — MASTER_ONLY if ever |
| Auto-réparation DP / FeatureFallbackRouter | Do **not** invent self-heal that mutates mappings at runtime as default |
| Battery non-linear | Already `BatteryMasterEngine` |
| Strict issue templates | **Already** `.github/ISSUE_TEMPLATE/` |
| Auto-triage labels | Partially exists (`auto-bot-issue-triage`) — don’t replace blindly |
| Forum → GitHub bot posts | **T157628 silent** — no forum bots |
| Branches `main`/`develop` | Tip = **`master` + `stable-v5`** dual-app |
| Conventional commits + husky | Pre-commit gate already; don’t force rewrite history |
| “Generate cleanup/_hybrid or memory-check first?” | **No** to both as proposed |

## Keep (already the compass)
`docs/rules/PRAGMATIC_ROADMAP.md` · dual-app · sacred couples · layer passes · silent forum · P148/P157/P158 gates.

## Answer to “générer le code complet pour l’étape 1 ou 2 ?”
**No.** Étape 1 hybrid wipe = dangerous. Étape 2 naive memory-check = already superseded by smart gate.
