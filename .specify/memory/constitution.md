# Universal Tuya Zigbee — Constitution

Structure follows GitHub Spec Kit (github/spec-kit): `constitution → spec → plan → tasks`.
Specs live in `specs/NNN-*/{spec,plan,tasks}.md`. This file overrides any spec/plan.

## Identity (non-negotiable)
- I1. App IDs are frozen: `com.dlnraja.tuya.zigbee` (master, "Universal Tuya Test"),
  `com.dlnraja.tuya.zigbee.stable` (branch `stable-v5`), `com.dlnraja.tuya.zigbee.bastien`.
- I2. A master push without `[skip ci]` auto-publishes — batch pushes, few publishes.

## Device behaviour
- D1. **Native first.** Homey-native clusters/capabilities (homey-zigbeedriver + zigbee-clusters)
  are the primary path. Tuya DP (0xEF00), 0xE000/0xE001 and manufacturer-specific clusters are
  fallbacks, never mandatory for pairing.
- D2. **Fallbacks are additive.** Never degrade existing behaviour; a fallback that fails disables
  itself and never blocks pairing or init.
- D3. **No invented fingerprints.** Every manufacturerName/productId comes from a real interview,
  diag, issue or a cited upstream source. A mfr+pid couple lives on exactly one driver.
- D4. **Firmware quirks are opt-in** per mfr+pid and require ≥2 independent sources.
- D5. **Case-insensitive** matching at runtime for mfr/pid.
- D6. **No perceptible latency.** Dedupe/anti-flood passes the leading edge immediately; windows
  are short and configurable.

## Maintainer clarifications (2026-10-03)
- M1. Dedupe/anti-flood windows are chosen by comparing Z2M, ZHA, Johan's apps, deCONZ and localtuya and taking the
  most accurate value; they are dynamic per device type and per driver / mfr+pid profile, adaptive per case.
- M2. Double/triple-click detection is enabled automatically only where needed (remotes that do not send a native
  press type); otherwise it is off (no added latency).
- M3. Existing phantom/dual couples are kept as-is (frozen baseline); act only when a user reports a conflict
  (forum, threads, issues).
- M4. Lights without a driver (TS0502A/B, TS0505B, TS0501A): add to existing light drivers, unless that would conflict
  with another driver (e.g. TS0501A vs dimmer_wall_1gang) — then create a dedicated driver.
- M5. External PRs are merged intelligently in an enrichment mindset: keep the best of both, never degrade.
- M6. Stable publishes are grouped (batched), never one per fingerprint.

## Code & data
- C1. No copy-paste from other projects/people. Read, understand, rewrite as our own rules/quirks;
  keep only source link + author/project. Raw dumps do not stay in the repo. GPL code is never copied.
  Credit ideas in CREDITS.md.
- C2. `app.json` < 4 MB; large data is lazy-loaded from `data/`/`lib/` at runtime.
- C3. All gates pass before push, incl. `homey app validate --level publish` on Node 22.
- C4. Neutral commit wording.

- C5. **Deep reading for every source.** Forum threads (all posts + images), our issues/PRs, Johan's repo, other apps'
  threads, Z2M/ZHA/deCONZ/localtuya, Homey docs, diags/crash mails, forks, changelogs: read and understand finely
  (symptoms, context, firmware, interviews, DP logs, workarounds, regressions, conflicts, screenshots), reason,
  then write our own rules/code/SSOT. Regex/AI pre-extraction is only a helper, never the decision.

## Communication
- X1. Agents never post on GitHub/forum or reply to emails on behalf of the maintainer.

## Workflow
- W1. Rebase before each push (concurrent workers). Use a dedicated git worktree per agent;
  never run `git checkout -- .`/`git clean` in a shared checkout.
- W2. Long queues keep a resumable checkpoint in `data/leads/resume-checkpoint.json`;
  items are deferred, never skipped.
  Its `master_queue` is the single checklist of every user request since the start
  (rules, queues, harvests, forum, Johan, flows, conflicts, layers, workflows, size, specs);
  every daily resumption reads it FIRST, and an item is ticked `verified` only with evidence.
- W3. Progress ledger (nothing is done twice). `data/progress/ledger.json` is the machine SSOT:
  key `<namespace>:<id>` (johan-issue:N, dlnraja-issue:N, forum-post:T/P, diag:<hash>,
  task:<id>, …) → status (pending | in-progress | deferred | done | skipped-not-applicable),
  commit, date, content hash and/or upstream updatedAt. Every workflow and agent (forum poll,
  Johan scanner, enrich, diags, fleet-enrich, deep reads, maintenance queues) reads it before
  working (`shouldProcess` in `scripts/lib/ledger.js`, or `node scripts/progress/ledger-cli.js
  check <key> [updatedAt]`) and records after (`record`). Items already done and unchanged are
  skipped; changed items (new hash / newer updatedAt) are re-processed. Humans read
  `docs/progress/JOURNAL.md` (dated entries, newest first). Older checkpoints
  (resume-checkpoint, deep-read-checkpoint, deep-read-log) stay as cursors linked from the
  ledger's `checkpoints` map.
- W4. Driver conflicts are researched, not deleted. For every mfr+pid couple claimed by two or
  more drivers (ledger namespace `conflict:<mfr>|<pid>`) and every user-reported conflict: look up
  the real hardware (Z2M converters/device pages, ZHA quirks, deCONZ, Blakadder, Homey forum,
  Johan's repo, other Homey/ST/Hubitat/Jeedom apps), then, per pid, keep the couple in the single
  driver matching that hardware (native first, never degrade, never invent mfr/pid, the 3 app IDs
  stay intact). Create a new driver/category only when existing drivers truly conflict. Apply the
  same placement on master and stable. Write the reasoning in our own words with links + credits
  in `docs/rules/` and the ledger. Phantom cross-product couples are left alone unless they
  actually collide or a user reports a conflict. Work frugally: a few couples per daily run,
  user-reported and source-backed couples first; cursor in `data/leads/resume-checkpoint.json`.
- W5. Interviews are the MINIMUM baseline for pairing. Never degrade a driver or remove
  capabilities because an interview shows less than what is implemented. Only
  interview-observed clusters may be required for pairing; every extra DP, cluster or
  capability is optional and complementary and must never block pairing. Enrichment is
  additive only.
- W6. Never degrade any driver. Every driver/device follows dynamic, self-adaptive enrichment:
  capabilities, DPs and clusters are added at runtime when the device actually reports them
  (additive, optional, never blocking pairing), and nothing that works today is ever removed.
  This applies to all conflict (W4) and interview (W5) work: moving a couple is allowed only
  when the old placement has no working couple or the new one is a strict superset in
  behaviour; existing paired devices keep their driver.
- W7. Polysemic DPs. When one DP number means different things per mfr, pid, variant or
  firmware, the app adapts per device: variant profiles keyed by mfr+pid(+firmware), value
  range/type detection and cross-validation with other DPs. No DP is ever neglected (unknown
  ones are logged and learned), internal cross-checks are used when ambiguous, and fallbacks
  are additive — never degrading a working mapping.
- W8. Reuse our own tooling. The project's parsers, scrapers and scanners (scripts/*, tools/*,
  .github/scripts/*) are inventoried; unused or broken ones are fixed or retired, and their
  outputs feed the ledger and SSOT (docs, workflows, automations). Done frugally with
  checkpoints.
- W9. Alternative paths for partial native support. When a DP, cluster or attribute is not
  fully supported natively, provide alternative paths — lower level (raw ZCL frames,
  manufacturer-specific commands) and/or higher level (Tuya DP layer, app-side logic, polling,
  virtual capabilities) — orchestrated with circuit breakers so a failing path self-disables.
  Anything not native per the interviews, the Homey SDK, zigbee-clusters or the Homey docs stays
  optional and is never mandatory for pairing.
- W10. Self-improving, free. Scheduled GitHub Actions regularly ingest technical changes from
  sources (Z2M/ZHA/deCONZ converters, Homey SDK/docs, forum, Johan, other apps) and turn only
  CHANGED items (ledger W3) into SSOT/rule proposals. Everything runs free: no paid APIs, local
  or free tiers only (AI_ALLOW_PAID=false). Extend existing workflows before adding new ones.
- W11. Proprietary layers, local-first. Manufacturer layers on top of Zigbee (Tuya 0xEF00/0xE000/
  0xE001, MOES, Smartlife, Legrand 0xFC01/0xFC40, Lexman/Enki, Sonoff 0xFC11/0xFC57, Xiaomi/Aqara
  0xFCC0, IKEA, Philips 0xFC03, Schneider, …) are supported fully and locally, with no cloud
  dependency, as optional additive layers with circuit breakers that never block pairing, and are
  registered in the native/non-native matrix. Sources (Z2M, ZHA, deCONZ) are credited by name.

## Preferences (PC harvest round 2, 2026-10-04)
- P1. Case-insensitive everywhere (mfr/pid/lookups).
- P2. Wi-Fi: tuya-local first, inspired by the Tuya cloud Homey apps.
- P3. Heuristic multipliers/divisors (auto scale detection) rather than fixed values.
- P4. Regular automatic reorganisation of files/folders.
- P5. Always read diagnostic log IDs posted on forum/GitHub/chat.
- P6. Branches: keep master, stable-v5 and gh-pages; merge or clean the rest only with approval.
- P7. Communication: French, tables, action over explanation, no needless questions, continuous flow.

## Rules (PC harvest round 3, 2026-10-04)
Merged without changing W1–W11 / P1–P7; where they overlap, they make an existing rule explicit.
- R1. Secrets (keys, PATs, tokens) never go online, in code, logs, issues or reports; only in GitHub Secrets.
- R2. Stay within included plans and AI quotas (flat-rate/token plans); prefer free sources and caches.
  Only still-active subscriptions within their included quota: hard rate limits, a daily request cap,
  automatic disable for the day on 429/quota errors, never on-demand tokens, credits or overage billing
  (user decision 2026-10-04; enforced in `.github/scripts/ai-helper.js`).
- R3. Each app keeps its own purpose: master (`.tuya.zigbee`, fast enrichment), stable-v5 (`.stable`,
  device compatibility, grouped publishes), bastien-home (`.bastien`, friend's test app). Port fixes
  as adapted enrichments, never wholesale copies; couple placement stays the same (W4).
- R4. Every fix ships with a unit test that locks it (regression guard); mirrored in agent prompts.
- R5. Non-native DPs/clusters are complements (rx/tx, raw, stream), never mandatory (extends W5/W9).
- R6. Never invent productIds or manufacturerNames (Green Power included). New compose clusters only
  from a real interview; Zigbee 4.0 awareness is not evidence.
- R7. MCU time sync never hardcodes one format (epoch 1970/2000, local/UTC, timezone per device).
- R8. RF coexistence: Wi-Fi channels 1/6/11 vs Zigbee 15/20/25 in advice and diagnostics.
- R9. Workflows tolerate missing sources (never block), use a fetch cache and incremental diffs,
  and stay polite with servers (extends W10).
- R10. Enrichments are variants/alternatives, never degradations, on every app (explicit form of W6).
- R11. A couple missing from a log is never invented: ask for the next diagnostic with mfr+pid.
  A guess is allowed only as a labelled hypothesis, then verified.
- R12. Product rules for batteries: SOS/alarm buttons get an inverted-signal setting with automatic
  detection; sleepy devices follow the battery-saving policy (lib/battery/*, PowerClusterPolicy).
- R13. Workflows run fully without AI: deterministic algorithms first. AI subscriptions are an
  optional complementary layer (user decision 2026-10-04): keys only in GitHub Secrets, never in
  code; the AI step is skipped when its secret is absent; quota rules of R2 apply (extends W10/R9).
- R14. stable-v5 is the hardened, reliable line, inspired by the versions that worked best (forum
  feedback); master carries advanced features. Never copy one onto the other (clarifies R3).
- R15. Scraping stays within free tiers (e.g. firecrawl free); prefer free tools and caches (R2).
- R16. Malformed or synthetic manufacturerNames (e.g. `_TZE2841000000_*`, `_TZE28C1000000_*` from
  PR #512) are never added and are rejected by the fingerprint gate.
- R17. GitOps automation only as draft PRs on dlnraja's own repository: no auto-merge, no issue or
  comment posting; gates decide; publishing stays batched (user decision 2026-10-04).
- R18. Comments on third-party repositories (e.g. JohanBendz) are never deleted or edited by agents;
  that stays a manual user action.
- R19. No blind cross-product of brand names (e.g. HOBEIAN) over mfr/pid lists; only verified couples.
- R20. Robust identifier normalization (extends P1): manufacturerName, productId, modelId and device
  strings are compared through one normalizer at read and match time (case, whitespace/NUL padding,
  trailing \u0000, Latin-1/UTF-8/ASCII, zero-width/invisible and look-alike characters, length-prefixed
  Zigbee strings, `_`/`-` variants), while prefixes such as `_TZE200`/`_TZE204`/`_TZE284` stay distinct.
  Originals are kept for display and diagnostics, data is not duplicated, and anything that matches
  today must still match; a gate flags colliding normalized couples and malformed entries.
