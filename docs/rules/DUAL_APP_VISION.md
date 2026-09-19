# Dual-App Vision — master vs stable-v5 (+ Bastien house)

> **NEVER full copy-paste between branches.** Enrich tracks according to PURPOSE.

Three Homey apps / tracks, one monorepo — **distinct Athom App IDs**:

| | **master** (preview / Test) | **stable-v5** (production) | **bastien-home** (private house) |
|---|---|---|---|
| **Branch** | `master` | `stable-v5` | `bastien-home` |
| **Athom App ID** | `com.dlnraja.tuya.zigbee` | `com.dlnraja.tuya.zigbee.stable` | `com.dlnraja.tuya.zigbee.bastien` |
| **Store name** | Universal Tuya | Tuya Unified (Stable) | Zigbee Bastien |
| **Goal** | Innovation + soak | Zero crashes LTS | Maison Bastien only |
| **Users** | Forum / Test | Everyday reliability | Bastien Homey Pro only |
| **Version line** | `9.0.x` | `5.12.x` | `1.0.x` |
| **Canonical clone** | `Documents\homey\master` | `Documents\homey\stable` | `Documents\homey\bastien` |

> **Bastien enrichment is one-way:** house learnings → master → (BOTH) stable. Never wholesale master→Bastien. Full doctrine: [`BASTIEN_HOUSE_APP.md`](BASTIEN_HOUSE_APP.md).

> App Store IDs and versions must **never** be overwritten when syncing. Protect `.homeycompose/app.json` / `package.json` / `app.json` identity fields on each track.
>
> **P139 (2026-08-21):** Stable draft `5.12.88` build #13 hit Athom `processing_failed` (`socket hang up`). Do **not** spam republish. Universal Tuya 9.0 Test is a **different** app and stays intact when Stable publishes to `.stable`.

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

Machine SSOT: [`config/architecture/dual-app-tracks.json`](../../config/architecture/dual-app-tracks.json)  
Forum failover: [`config/architecture/forum-complementary-failover-ssot.json`](../../config/architecture/forum-complementary-failover-ssot.json)  
Regular CI: `node tools/ci/l99-dual-app-enrich-gates.js` (BOTH always; MASTER_ONLY skipped on stable track)

### L99 recent (2026-09-14)

| Deliverable | Tag | Why |
|-------------|-----|-----|
| P2497 surgical BOTH backport to stable-v5 | **BOTH** | Reliability only; protect `.stable` App ID; no P2487 IR |
| P2498 pairing/discovery UX SSOT + learnmode | **BOTH** | Athom owns Zigbee UI; enrich learnmode; WiFi discovery |
| P2496 identity fields (productId/modelId/pid/productName) | **BOTH** | Pairing vocabulary — crash/wrong route prevention |
| P2495 publish path + sacred-keep preflight | **BOTH** | Compact drop / tip spam; stable soft CI matrix |
| P2494 sacred-couple SSOT | **BOTH** | mfs multi-pid NORMAL |
| P2493 workflow family gates | **BOTH** | Master hard; stable thinner |
| P2492 Homey button UI charter (physical↔virtual tiles) | **BOTH** | Coherent Homey UX — onoff/Channel vs Button device-view |
| P2491 AI efficiency / smart-map context compress | **BOTH** | Forfait + GH API burn; slim prompts; thinned crons |
| P2490 forum complementary failover (icka1clh keep + battery rehydrate + radar staleCaps) | **BOTH** | Compact drop / strip / phantom curtain |
| P2488 Smartbutton `measure_battery` keep-lock | **BOTH** | Hourly adapter strip → `?` battery |
| P2487 Intelligent IR UX + Homey Pronto TX | **MASTER_ONLY** | Feature; Zosung TX/RX reliability only if touched |
| P2484 EF00 init idempotent + gkfbdvyx sacred-keep | **BOTH** | Heap OOM / Unknown Zigbee |
| P2481 motionsensor foreign preempt | **BOTH** | Homey Pro 2026 serializer crash |
| Tip #3186 = 9.0.926 healthy; PF #3184/#3187 | **BOTH** | P139 soft-continue — no spam |

### L99 recent (2026-08-26)

| Deliverable | Tag | Why |
|-------------|-----|-----|
| P2286 publish soft-expect + temp-only path | **BOTH** | Orphan Athom builds / P139 race |
| P2448 rotary command/dimmer + P2449 declared flow wire | **BOTH** | Dead rotate / dead Flow cards |
| P2287 IAS leftover EF00 skip helper | **BOTH** | Sleepy IAS mesh brick |
| P2288 sacred-keep compaction pins | **BOTH** | Athom mfr×pid budget must not drop verified couples |
| P2284 wrapHandleFrame chain | **BOTH** | Never orphan 0xFD / PhysicalButtonMixin |
| SSOT `publish-ssot.json` + `PUBLISH_SSOT.md` | **BOTH** | Machine + human publish doctrine |

### L99 recent (2026-08-23)

| Deliverable | Tag | Why |
|-------------|-----|-----|
| EnergyJumpGuard → SmartDivisor, energy-compose / divisor gates | **BOTH** | Wrong kWh / Athom schema = reliability |
| HomeyGapCompensator soft notes, BootBudget / IntelligentLazyLoad | **BOTH** | 64MB / soft ensure |
| Flow title brand-scrub (no commercial names) | **BOTH** | UI hygiene; ids may stay `hue_*` |
| Daylight Atmosphere / Solar Sync / Path Light / Room Balance | **MASTER_ONLY** | Feature lighting stack |
| Lived-In Shuffle, availability, suppression, CI intel caches | **MASTER_ONLY** | Feature / CI-only |

## Backport rules (stable)

1. **Crash/reliability only** — never “sync the whole tree”
2. Must have run clean on master Test without new crash reports
3. Cherry-pick / surgical file edit — adapt to stable code shape (no blind paste)
4. Never copy: App ID, version, store changelog identity, master-only `lib/multichannel|autonomous|…`, free-scrape stack, AlarmPolarityManager smart-learn, CapabilityCommandRouter parallelDiscover
5. **Do** backport: SOS `async` + `Promise.resolve(…).catch`, `safe-timers` usage, IAS `zoneId: 10`, null guards (`auditCapabilities`, `this.error`), energy timer detach fixes, sacred-couple FP locks, MCU brightness clamp, Poll Control skip on sleepy, `onUninit` teardown, battery no-invent

## Anti-patterns

- Publishing stable with the **wrong** compose id (legacy shared `com.dlnraja.tuya.zigbee`) → overwrites Universal Tuya Test. Stable workflows must keep `APP_ID=com.dlnraja.tuya.zigbee.stable`.
- Republishing Stable immediately after Athom `processing_failed` (P139) — wait / use processing-failure gate.
- P52 “safe sync” of huge JSON dumps without reading purpose
- Porting AlarmPolarity “auto learn” to stable before soak + human OK
- Mentioning branch mechanics in Homey forum replies (silent enrichment)
- Porting HomeSuite **feature** managers (availability last-seen UI, rejoin flow cards, TX pacer) to stable without human promotion — those stay MASTER_ONLY

## HomeSuite study note (2026-08)

`gpmachado/com.gpm.homesuite` is GPL-3.0. We study behaviour and reimplement under MIT — **never copy sources**. Credits: `CREDITS.md` / `NOTICE`. Classification cheat-sheet lives in `.ai/KNOWLEDGE_CACHE.json` → `recentDiscoveries.homesuite`.

## Agent checklist

```
[ ] Classified BOTH | MASTER_ONLY | STABLE_ONLY
[ ] Master change does not pollute stable identity files
[ ] If BOTH: minimal patch adapted to stable, not full file replace
[ ] Cross-app note in PR / internal report
[ ] No forum auto-post
```

See also: `docs/rules/CROSS_APP_PROMPT_RULES.md`, `docs/P52_SAFE_SYNC_STRATEGY_2026-07-14.md`, `AGENTS.md` § Stable vs Master.
