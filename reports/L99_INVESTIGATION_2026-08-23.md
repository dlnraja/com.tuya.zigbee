# L99 INVESTIGATION — 2026-08-23

> Mode: GLOBAL_INVESTIGATION + Ship F/M. Forum SHADOW. SoftHypothesis ≠ lock.

## Live truth

| Track | Version | Homey Test |
|-------|---------|------------|
| `master` | **9.0.630** | Auto-Publish Test #2957 lineage |
| `stable-v5` | **5.12.88** | P139 processing_failed — no republish loop |

## Flow-card failure classes

| Class | Status | Locus |
|-------|--------|-------|
| Invented `*_1gang_button_pressed` / `*_button_N_button_pressed` | mitigated P2230 | `FlowCardHeuristics.js` |
| Dup flow IDs | gate | `flow-card-dup-gate.js` / `npm run flow:audit` |
| Orphan tokens | audit | `flow-coherence-audit.js` |
| Voice-safety button.* getable | fixed smart_rcbo | `check:voice` |
| Greyed Flows / heap | BootBudget P2183 | `app.js` deferred + `IntelligentLazyLoad` |

## Cross-sources (read-only)

| Source | Role |
|--------|------|
| Z2M / ZHA / Blakadder | sacred couples — `verified-sources.json` |
| Forum T140352+ | SHADOW GET — NEED_ACTION / PROCESS.md |
| Gmail diags | FLOW-GUARD, Tongou DP6, IAS |
| Johan / alt Homey apps | pattern mine only — silent implement, no forum attribution |
| Homey SDK3 | flow card schema |

## Sacred couples locked this arc

| Couple | Driver |
|--------|--------|
| `_TZE284_6ocnqlhn`+TS0601 | `din_rail_meter` |
| `_TZE200/204_lsanae15`+TS0601 | `energy_meter_din` (not smart_rcbo) |
| `_TZ3000_zgyzgdua`+TS0044 | `scene_switch_4` |
| `_TZ3000_xffhmvhv`+TS004F | `button_wireless_4` |

## Memory / lazy

- SSOT: `config/architecture/intelligent-infra.json` → `memory`
- Facade: `lib/performance/IntelligentLazyLoad.js`
- Tests: `test/critical/p2183-boot-budget.test.js`, `test/ci/intelligent-infra.test.js`

## Alt-apps

JohanBendz / community forks: scrape for FP + flow ID patterns only. Never invent pid from retail SKU. Never credit external threads in changelogs.

## Commands

```bash
npm run flow:audit
npm run flow:l99
npm run forum:process
npm run github:intel-respond
npm run infra:cache-stats
```

Generated: 2026-08-23 · L99 + Ship F/M
