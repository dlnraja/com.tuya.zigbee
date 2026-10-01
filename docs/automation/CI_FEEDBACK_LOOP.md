# CI consolidation + closed feedback loop (2026-10)

Everything runs in GitHub Actions with `GITHUB_TOKEN` only, on free public-repo runners.
No paid API, no vision API, no forum posting, no publishing added. Workflow and script commits
carry `[skip ci]`.

## 1. Consolidation / repair

Run history (14 days) showed these problems:
- unified-ci: 203 of 300 runs failed.
- syntax-check: 184 of 300 failed.
- auto-fix-and-publish: 134 of 300 failed, 804 min.
- auto-publish-on-push: 1929 min.
- continuous-flow: 1700 min, mostly push runs.
- fleet-intelligent-enrich: failures at its push step.

| Workflow | Change |
|---|---|
| unified-ci, auto-publish-on-push, auto-fix-and-publish | Push trigger gets `paths-ignore: docs/**, reports/**, **/*.md, .github/ISSUE_TEMPLATE/**`, so docs-only pushes no longer run the full pipeline. |
| continuous-flow | Removed `tools/**` and `.github/state/**` from the push paths. State is gitignored, and CI-script pushes are already covered by unified-ci. The manual `mode=apply` commit goes through safe-auto-commit. The job had `contents: read`, so that push could never succeed before. |
| fleet-intelligent-enrich | Its commit step ran `pull --rebase` on a dirty tree and then pushed non-fast-forward. It now uses safe-auto-commit. |
| market-couples-intake | Commits through safe-auto-commit. Adds the feedback-loop merge step and the rules-digest cache. |
| All workflows | Checked: each has `timeout-minutes` and concurrency, and no two crons are exact duplicates. |

Nothing was deleted or disabled.

## 2. Safety gate: `scripts/ci/safe-auto-commit.js`

Usage: `--id --message --paths [--branch] [--max-per-day=1] [--dry]`

1. **Loop guard.** Refuses a push event from a `[bot]` actor. Also refuses when the last 3 origin commits are `[auto:` commits less than 1 h old.
2. **Daily cap.** Allows at most N `[auto:<id>]` commits since UTC midnight.
3. **Local gates on staged files.**
   - JSON parse, `node --check`, TITAN patterns.
   - Then the p2138 sacred-couple matrix, regression-lessons, anti-bot and p214 gates.
   - The gates are differential: a gate that is already red on the baseline only produces a warning.
4. **Commit and push.** The commit message is `<msg> [auto:<id>] [skip ci]`. Push uses `pull --rebase` with 3 retries and aborts on conflict.
5. **On refusal or failure.** Creates or edits ONE comment on the tracking issue #557 (marker `<!-- safe-auto-commit:<id> -->`) and does not push.

Publishing to Test still happens only through the existing auto-publish after validation.

## 3. Closed feedback loop

```
daily-digest (homey · forum · inspiration · git-mine)
   └─ scripts/digest/leads.js → artifact digest-leads-<job>-<run> (14 d)
market-couples-intake (daily)
   └─ download last 12 daily-digest runs' artifacts
   └─ scripts/digest/leads-merge.js  (+ rules-digest guardrails)
        → .github/state/digest-leads/{couples,signals}.json
   └─ tools/ci/cross-ref-all-sources.js  processDigestLeads()
   └─ existing tiering → apply-market-couples (apply-safe tiers only) → safe-auto-commit
```

**Inputs** (incremental, cursors stored in the #557 state):
- own repo issues/PRs and comments;
- all public JohanBendz repos;
- forum topic 140352;
- Gmail diagnostics artifact;
- git commit messages on `master`, `stable-v5` and `bastien-home`;
- screenshots, read with tesseract OCR on the runner;
- linked Z2M / Blakadder device pages.

**Leads** come in two kinds:
- **Couples.** A manufacturerName + productId pair. It is emitted only from an interview block, or when exactly one mfr and one pid appear in the item. Never a cartesian product, never an invented pid.
- **Functional leads.** DP, cluster, raw frame, MCU behaviour (time-sync, magic packet, sleepy no-report, scale factor, inversion), and unmapped/needs-handler items.

**Heuristic handling.**
- A lead is `heuristic` when it comes from OCR, a fetched link or git history.
- leads-merge promotes a heuristic couple only when the exact couple exists in the Z2M herdsman cache, Blakadder, or the Z2M/ZHA/deCONZ crawls. Otherwise it keeps the label `digest-heuristic`, which belongs to no tier and is report-only.
- `bastien-home` is never promoted.
- DP meanings are never guessed. They are only cross-checked against the DP names in the Z2M cache (`dpVerified`).
- Digest labels (`forum`, `github-own`, `johan-issue`, `johan-comment`) are not apply-safe tiers, so they add evidence only. Nothing escalates to the `interview` tier.

**Rules digest.** `scripts/digest/rules-digest.js` builds `.github/state/rules-digest.json` at runtime. That path is gitignored, the result is hash-cached, and an `actions/cache` keyed on the docs means it is rebuilt only when the docs change. It contains:
- the imperative rules;
- the guardrails;
- DEVICE_TRUTH mfr pins;
- recent changelog headings.

## 4. Anti-ban budgets

| Area | Limits |
|---|---|
| GitHub API | Per-process call budget (`DIGEST_MAX_API_CALLS`). 300–800 ms jitter. Retry-After is honoured. A floor stops the run gracefully when core remaining < 50 or search remaining < 2. Code search: ≤ 5 per run, 7 s apart. |
| Forum | 1 topic request plus ≤ 3 post fetches, 2–5 s apart. On 429/403, 20 h cooldown. OCR only for images served by the Discourse CDN, so the forum host gets no extra hits. |
| OCR | ≤ 5 images per run in inspiration (Tuya repos only), ≤ 3 in forum. Links: ≤ 3 per run, 1.5–3 s apart. |
| Git mining | ≤ 5 × 100 commits per branch per run. Backfill runs oldest window first. Comments are posted only for commits < 14 days old. |

## 5. Branches

- **master:** enrichment commits through safe-auto-commit. Test publishing is unchanged, via auto-publish after validation.
- **stable-v5:** gets git-side enrichment from history mining (report and evidence only) and CI health in the digest. Its own `publish-stable.yml` (on push to stable-v5) keeps its pre-validation and soak gates. These scripts never push to stable-v5 and never promote Stable to Test.

## 6. Phase 2 (2026-10-01)

**Wording.** Messages written by the generators (#557 comments, triage comments, commit messages) no longer name external projects. They say "external cross-reference" / "réf. externe" instead, per CORE_RULES.

**Hooks.** `.githooks/pre-commit` and `.githooks/pre-push` are now executable and run normally.

**AI.** The central guard (`.github/scripts/ai-helper.js`, `config/security/ai-plan-forfait.json`) already keeps remote AI off by default (`AI_FORCE_LOCAL`, `GMAIL_DIAG_AI_MAX=0` in CI).
- The cancelled paid providers are neutralized in every workflow: their key is set to `''`. The same providers are refused in `scripts/automation/api-key-manager.js` (`AI_CANCELLED_PROVIDERS`). They are Kimi, DeepSeek, OpenAI, Anthropic, MiniMax and Xiaomi MiMo.
- The other AI keys stay optional. Gemini, Groq, Cerebras, HF, OpenRouter, Mistral, Together and NVIDIA keys are all removed at once when the repo variable `AI_DISABLED=true` is set.
- Every caller already falls back to deterministic local heuristics when no AI answer comes back.

**Scraper key.** The Firecrawl key is optional: it is removed when the repo variable `FIRECRAWL_DISABLED=true` is set. The library keeps its daily cap (`FIRECRAWL_DAILY_MAX`, 5 by default) and always tries the keyless reader first.

**Forum.** forum-watch covers 6 topics: 140352, 26439, 89271, 146735 and 154077 rotate after the primary 140352, plus 21313. There are still at most 4 Discourse requests per run in total. Each topic needs one request (`/t/<id>/<n>.json`).

**OCR.** tesseract runs with ImageMagick preprocessing (grayscale, 2× upscale, normalize, threshold) in eng+fra+deu+nld+spa+ita. Optional Gemini vision is used only when `AI_ALLOW_REMOTE=true` and a key is present, at most 2 per run.

**Firmware quirks.** `scripts/digest/quirks.js` and `quirks-scan.js` build a per-couple dataset, persisted with `actions/cache`.
- Categories come from multilingual rules.
- Inputs: our own leads, ≤4 GitHub issue searches per run across public Zigbee projects, and 1 rotating community Discourse search.
- A quirk stays heuristic until 2 distinct sources agree.
- The #557 comment lists only new entries, with no URLs and no external names.

**Self-living.**
- `notifications.yml` › `auto-triage`: on a new issue, adds existing labels and posts one "what we already know" comment, deduplicated by a marker. Deterministic, no AI.
- `ci-health`: checks whether the master version is visible on the Test channel, using the public apps API. It alerts #557 when the same version is still missing at the next check, and posts a recovery line once it appears.
- `daily-digest` › `weekly` (Monday 09:07 Paris): weekly summary plus a per-driver health score.

**Batch respond.** In `auto-close-supported.yml`, the read-only JohanBendz shadow pass is capped at 60 items and 12 min. Before, it hit the 45-min job limit and the whole run was cancelled.

**Git mining.** History is mined newest first (everything newer than `head`), then older commits are backfilled with the remaining page budget.

**Rules digest.** It now also reads README, `.homeychangelog.json` and this document. It carries the app roles (stable-v5 simple / maximum coverage, master heuristics, bastien-home experimental) and the discoveries above.
