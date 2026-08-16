# Dual-App Vision — master vs stable-v5

> **NEVER full copy-paste between branches.** Enrich both tracks according to PURPOSE.

Two Homey apps / tracks, one monorepo:

| | **master** (preview / Test) | **stable-v5** (production) |
|---|---|---|
| **Branch** | `master` | `stable-v5` |
| **Goal** | Innovation + soak new fixes | Zero crashes, zero surprises |
| **Users** | Early adopters, forum power users | Everyday reliability |
| **Version line** | `9.0.x` (bot bump) | `5.12.x` (or `*-stable.N`) — keep distinct |
| **What lands** | Features + reliability | **Reliability only** (after soak on master) |

> App Store IDs and versions must **never** be overwritten when syncing. Protect `.homeycompose/app.json` / `package.json` / `app.json` identity fields on each track.

## Purpose (do not blur)

### master — Universal Tuya preview / Test (advanced)
- New fingerprints, drivers, flow engines, smart managers
- Free-scrape / diag orchestrators / AlarmPolarity **smart learn**
- CapabilityCommandRouter parallel discover, experimental cascades
- Mega-crawler, forum silent enrichment pipelines
- May break; Test channel is the soak bed

### stable-v5 — reliability LTS track
- Crash guards, timer safety, IAS enroll, battery correctness
- Sacred-couple routing fixes that stop wrong pairing
- SDK3 / publish / security redaction when low-risk
- **No** new feature managers (availability, presence sim, circadian, scrape stacks, smart polarity learn, unsupported-cluster race discover, …) unless explicitly promoted after soak

## Classification (every change)

Before coding, classify:

| Tag | Meaning | Action |
|-----|---------|--------|
| `BOTH` | Crash / data / security / timer / SDK3 listener bug | Fix on master first → soak → selective backport to stable |
| `MASTER_ONLY` | Feature, smart learn, scrape automation, experimental DP race | Stay on master forever (until human promotes) |
| `STABLE_ONLY` | Stable identity, stable publish workflow, LTS versioning | Never pull into master as identity |

## Backport rules (stable)

1. **Crash/reliability only** — never “sync the whole tree”
2. Must have run clean on master Test without new crash reports
3. Cherry-pick / surgical file edit — adapt to stable code shape (no blind paste)
4. Never copy: App ID, version, store changelog identity, master-only `lib/multichannel|autonomous|…`, free-scrape stack, AlarmPolarityManager smart-learn, CapabilityCommandRouter parallelDiscover
5. **Do** backport: SOS `async` + `Promise.resolve(…).catch`, `safe-timers` usage, IAS `zoneId: 10`, null guards (`auditCapabilities`, `this.error`), energy timer detach fixes

## Anti-patterns

- Publishing **stable → Test** on the **same App ID** as master → overwrites Test with 5.12.x (Peter saw 5.12.70). Prefer stable Live / distinct ID when possible.
- P52 “safe sync” of huge JSON dumps without reading purpose
- Porting AlarmPolarity “auto learn” to stable before soak + human OK
- Mentioning branch mechanics in Homey forum replies (silent enrichment)

## Agent checklist

```
[ ] Classified BOTH | MASTER_ONLY | STABLE_ONLY
[ ] Master change does not pollute stable identity files
[ ] If BOTH: minimal patch adapted to stable, not full file replace
[ ] Cross-app note in PR / internal report
[ ] No forum auto-post
```

See also: `docs/rules/CROSS_APP_PROMPT_RULES.md`, `docs/P52_SAFE_SYNC_STRATEGY_2026-07-14.md`, `AGENTS.md` § Stable vs Master.
