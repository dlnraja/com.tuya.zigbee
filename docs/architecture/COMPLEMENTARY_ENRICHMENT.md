# Complementary enrichment architecture (P2224 + P2490)

> **Policy:** Complete current architectures by **adding** layers, catalogs, and crosswalks inspired by project evolution (v5→v9). Do not collapse or remove working stacks.
>
> **Dual-app:** Catalogs apply on **BOTH** tracks for CI. Homey runtime only ships slim libs — see [`CI_VS_HOMEY_RUNTIME.md`](./CI_VS_HOMEY_RUNTIME.md). Never change App ID when back-porting.

## P2490 — Forum complementary failover (2026-09-14)

Machine SSOT: [`config/architecture/forum-complementary-failover-ssot.json`](../../config/architecture/forum-complementary-failover-ssot.json)

**Mandate:** when T140352 / Gmail diag recur, stack **all** layers — do not stop at the first fix:

| Layer | Example |
|-------|---------|
| Sacred-keep | Pin `icka1clh` after Athom compact drop (MIAMO) |
| Adapter keep + rehydrate | Peter `measure_battery` (P2488 keep + P2490 `toAdd` / boot) |
| DynCap / staleCaps | VicHY curtain phantoms on radar |
| EF00 force / soft-create | Eduard / MIAMO curtain_motor |
| Tip soft-expect | Healthy #3186 while #3187 PF — no spam |
| Tip-lag triage | Crash mails 9.0.891/895 = P2481 already shipped |

Reports: `reports/forum-l99-2026-09-14-t140352/COMPLEMENTARY_FAILOVER.md` · `reports/gmail-diag-2026-09-14/TREAT_LIVE.md`  
Gates: `npm run check:p2490` · `npm run check:p248x`

## Evolution eras → live SSOT

| Era | Theme | Live complementary home |
|-----|--------|-------------------------|
| v5 fat classes | Monoliths | Lessons in `PROJECT_EVOLUTION_HISTORY.md` |
| v7 mixins | Physical / Virtual buttons | `PhysicalButtonMixin` + `VirtualButtonMixin` + P2220–P2223 cascade |
| v8 Phoenix | L14, UnifiedBattery, Fleetwood, SmartDivisor | `l14_telemetry`, `battery`, `ci_fleetwood`, `energy_divisors` domains |
| v9 Sovereign | Dual-app, silent enrichment, sacred couples | `config/enrichment/*`, `sacred_couple_fp`, `dual_app_publish` |
| v9.0.926+ | Forum complementary failover | `forum-complementary-failover-ssot.json` + P2487–P2490 |

## Parallel layer vocabularies (all valid)

Do **not** pick one numbering and delete the others. Use the glossary:

**`config/resilience/layer-glossary.json`**

| Scheme | Meaning |
|--------|---------|
| Pipeline L0–L11 | `AI_CONTEXT_MANDATE` / GLOBAL_INVESTIGATION_PLAN |
| BYPASS Elite L1–L9 | May 2026 intent (`BYPASS_ELITE_LAYERS.md`) — complemented by `UniversalLayerBootstrap` |
| Capability L0–L6 | `LAYERS_CAPABILITY_PROTOCOL.md` |
| Button capture L1–L8 | `button-capture-cascade.json` |
| AI 3 layers | IDE / GHA / Homey runtime (`ARCHITECTURE_AI.md`) |

## Catalogs to extend (additive)

| Catalog | Role |
|---------|------|
| `config/resilience/domains.json` | Homey gaps + parallel stacks + gates/tests per domain |
| `config/resilience/bug-classes.json` | Historical FIXED/PARTIAL/OPEN |
| `config/resilience/button-capture-cascade.json` | Button RX cascade |
| `config/enrichment/models/*` | Silent investigate + heuristics; routes issues → resilience domains |
| `docs/RULES_PHYSICAL_BUTTONS.md` | Bidirectional + cascade doctrine |

## Runtime complements (Homey app — not GHA)

- `lib/layers/UniversalLayerBootstrap.js`
- `lib/resilience/HomeyGapCompensator.js`
- `lib/mixins/ButtonCaptureCascade.js` + `lib/resilience/data/button-capture-cascade.json`
- `lib/helpers/UnknownCaseRealigner.js` + `lib/helpers/data/heuristic-model.json`

## CI complements (GitHub Actions only — `.homeyignore`)

- `lib/enrichment/PhaseRunner.js`, `EnrichmentRegistry.js`, `NeedActionInvestigator.js`
- `config/enrichment/*`, `config/resilience/*` catalogs, `config/security/*`
- `tools/ci/silent-enrichment-orchestrator.js`, `project-resilience-orchestrator.js`

## Commands

```bash
# CI
npm run resilience:inventory
npm run resilience:critical
npm run resilience:all
npm run enrich:silent
```

## Workflows (systematic)

| Workflow | What runs |
|----------|-----------|
| `project-resilience.yml` | Daily inventory + critical-first + gates |
| `forum-poll.yml` | Inventory + critical-only after silent enrich |
| `auto-enrich-closed-loop.yml` | Inventory + critical-first fleet |
| `fetch-diags.yml` | Inventory + critical-only after diag enrich |

## Related docs

- `docs/CHRONOLOGICAL_EVOLUTION.md`
- `docs/PROJECT_EVOLUTION_HISTORY.md`
- `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`
- `docs/architecture/LAYERS_ENERGY_BUTTONS_FLOWS.md`
- `docs/architecture/ARCHITECTURE_TELEMETRY_V5.md`
- `docs/architecture/PUBLISH_SSOT.md`
- `docs/architecture/INTELLIGENT_IR_SSOT.md` (P2487 MASTER_ONLY UX)
- `docs/rules/BYPASS_ELITE_LAYERS.md`
- `docs/rules/DUAL_APP_VISION.md`
- `docs/knowledge/PECULIARITIES.md` (live locks P2481–P2490)
- `config/resilience/critical-gaps.json`
