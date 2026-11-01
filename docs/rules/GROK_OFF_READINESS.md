# Grok-off readiness (P3111, 01/11/2026 Paris)

Goal (owner, t639u / t670u / t673u): if Grok Bot is unplugged, the project keeps running **for free on
GitHub Actions alone**, with guardrails. Scheduled workflows only run from the default branch (`master`);
stable-v5 and bastien-home are handled by master's workflows (matrix or explicit `ref:`), and carry the
same scripts for parity.

Dead-man: `grok-off-deadman.yml` (Mondays 06:29 UTC) checks every row below. If one has not succeeded
inside its window it opens or edits **one** issue ("Dead-man: autonomous workflow stale"), and closes it
when all rows are green. The daily `autonomy-watchdog.yml` re-dispatches stale non-publish jobs once.

Kill switches: `config/autonomy-paused` (all) or `config/autonomy-paused.<feature>` with feature in
enrich, autofix, publish, learn, watch, crash-triage, revert. Bots cannot change them (bot-commit-guard).

| Duty (Grok routine) | Workflow(s) | Schedule (UTC) | Kill switch | Status |
|---|---|---|---|---|
| CI et PRs: CI repair | ci-autofix.yml (+ autofix gate) | on CI failure | autonomy-paused.autofix | covered |
| CI et PRs: PR approve/merge with gates | smart-pr-merge.yml, pr-gate.yml, dependabot-auto-merge.yml | on PR events | autonomy-paused | covered |
| CI et PRs: revert a red bot commit | bot-revert-on-red.yml | on CI failure | autonomy-paused.revert | covered |
| Mails projet: Gmail diag / Athom / GitHub triage | gmail-diagnostics.yml, l99-inbox-intelligence.yml, community-inbox.yml | 0 0,6,12,18 * * * ; 45 3,11,19 * * * ; 17 5 * * * | autonomy-paused | covered |
| Mails projet: Gmail token kept alive | gmail-token-keepalive.yml | 0 8 * * * | - | covered |
| Mails projet: Athom outcomes ledger | publish-hold-bisect.yml (hourly), athom-build-history.yml | 23 * * * * ; daily from P3112 | autonomy-paused.publish | gap closed by P3112 (was dispatch-only) |
| Mails projet: Bastien diag auto-replies | diag-autoreply-bastien.yml (P3110, other session) | 17 6,10,14,18 * * * | own switch (P3110) | in progress (P3110) |
| Diagnostics fetch + crash triage | fetch-diags.yml, crash-triage.yml, offline-crash-analyzer.yml | 25 */6 ; 52 7 ; 5 5 daily | autonomy-paused.crash-triage | covered |
| Forum scan (read-only) | forum-poll.yml, forum-pm-read.yml | 15 2,8,14,20 ; 50 7,19 | autonomy-paused.watch | covered |
| Enrich loop | auto-enrich-closed-loop.yml, fleet-intelligent-enrich.yml, market-couples-intake.yml | 0 */6 ; 35 1,13 ; 50 4 | autonomy-paused.enrich | covered |
| CI health | autonomy-watchdog.yml (heartbeat), ci-self-check.yml, platform-budget.yml | 13 5 daily ; 41 5 Mon ; 17 3 Mon | autonomy-paused.watch | covered (first scheduled run pending) |
| Reprise (resume interrupted work) | recurrent-orchestrator.yml, repo-autopilot.yml | 30 3 ; 35 6 daily | autonomy-paused | covered |
| Promotion des pistes (soak -> port) | safe-sync-stable.yml, bastien-promote-upstream.yml (R-soak gate) | 25 4 ; 20 6,18 daily | autonomy-paused | covered |
| Veille upstream | upstream-watch.yml, johan-thread-intel.yml | 37 6 ; 40 3 daily | autonomy-paused.watch | covered (first scheduled run pending) |
| Etat Athom | publish-self-heal.yml, publish-hold-bisect.yml, version-health.yml | 0 4,8,12,16,20 ; hourly ; Mon/Thu | autonomy-paused.publish | covered |
| Bases de connaissances (Z2M/ZHA/Blakadder, coverage) | kb-refresh.yml, homey-knowledge-refresh.yml, blakadder-fetch.yml, knowledge-graph-sync.yml, monthly-scan.yml | Mon ; Mon+Thu ; daily ; daily ; monthly | autonomy-paused.enrich | covered |
| Envois master par etapes (publish cap 4/24 h, 120 min) | auto-fix-and-publish.yml, auto-publish-on-push.yml | 5 */6 + push | autonomy-paused.publish | covered |
| Reponses anti-flood (public posts) | none on purpose: replies are queued, the owner approves them | - | - | **owner gate kept** (no auto public posting; DISCOURSE_API_KEY not configured) |
| Garde donnees perso | autonomy-watchdog.yml (3 branches), code-quality.yml, secret-scan.yml | 13 5 daily + push | - (always on) | covered |
| Dead-man (this file) | grok-off-deadman.yml | 29 6 * * 1 | autonomy-paused.watch | added P3111 |
| Weekly digest | autonomy-digest.yml | 7 7 * * 1 | autonomy-paused | covered |

## Secrets

Used and configured: GITHUB_TOKEN, GH_PAT, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL/PASSWORD,
HOMEY_REFRESH_TOKEN, GMAIL_* (OAuth + app password), GOOGLE_API_KEY, FIRECRAWL_API_KEY, free AI keys.

Referenced but **not configured** (each workflow must skip cleanly without them): GROQ_API_KEY,
DISCOURSE_API_KEY (keeps forum posting impossible, intended), GH_TOKEN (use GH_PAT), CRAWL4AI_URL,
OCR_LLM_AUTH_TOKEN, GOOGLE_AI_KEY, GEMINI_API_KEY, EMAIL_GUARD_ALLOW.

## Known limits

- GitHub disables cron in a public repo after 60 days without commits; bot commits keep it alive.
- New workflows can wait hours for their first cron run; the dead-man reports them as `never` until then.
- Free-quota budget: public repo minutes are free; every job has `timeout-minutes` and a `concurrency`
  group; AI steps stay on free tiers (`AI_ALLOW_REMOTE` off by default in watchdog jobs).
