# Complementary variant enrich — ALWAYS (P2520)

> **Vision:** every enrichment is a **variant / addition / parallel alternative**. Never a degradation overwrite.
>
> Machine SSOT: [`config/architecture/complementary-variant-enrich-ssot.json`](../../config/architecture/complementary-variant-enrich-ssot.json)  
> Architecture: [`docs/architecture/COMPLEMENTARY_ENRICHMENT.md`](../architecture/COMPLEMENTARY_ENRICHMENT.md)  
> Merge helper: [`lib/enrichment/ComplementaryMerge.js`](../../lib/enrichment/ComplementaryMerge.js)  
> Gates: `npm run check:p2520` · `npm run check:p2519`

## WHY (P215)

| | |
|--|--|
| **Pourquoi** | Fleet/market/case-variant enrich historically *replaced* arrays and re-painted wrong drivers (climate←6gang, leak←krwtzhfd, settings wipe). |
| **Comment** | Union merges only (`ComplementaryMerge`); sacred couples locked; misattribution registry forbids; CI gates fail on shrink/drop. |
| **Pour qui** | Homey users on **both** Test apps + CI bots that enrich. |
| **Quand** | Every prompt, every enrich cron, every `--apply`, every dual-app port. |
| **Contre quoi** | Capability wipe, mfr shrink, invent pid, move couple by delete+add to wrong driver, settings `= []` rewrite. |

## Golden rules (everywhere, always)

1. **Treat incoming data as variants** — OEM siblings, case forms, extra pids, extra settings IDs, extra flow cards.
2. **Union / append** — `manufacturerName`, `productId`, `capabilities`, clusters, flow card IDs.
3. **Settings** — append by `id`; never replace the whole `settings` array.
4. **DP maps** — merge keys; preserve existing capability bindings unless registry forbids the binding.
5. **Never invent pid** as a hard lock; soft hypotheses stay soft.
6. **One mfr → many pids is NORMAL** — do not prune mfr from driver A because it exists on driver B with a different pid.
7. **Removals only when** forbidden-placement / wrong sacred couple / prepare-publish synthetic prune / explicit human surgical fix.
8. **Dual-app BOTH** for reliability enrich locks — port surgically same session; never copy App ID/version.

## P2541 reinstruct — dual-case + wipe recovery

Machine SSOT: [`config/architecture/complementary-reinstate-notions-ssot.json`](../../config/architecture/complementary-reinstate-notions-ssot.json) · gate `npm run check:p2541`

| Notion | Rule |
|--------|------|
| complementary-enrich | Variants only — never `manufacturerName=[]` wipe |
| dual-case-identity | Use `appendIdentityStrings`, **not** `unionStrings`, on Homey dual-case mfr arrays |
| sacred-couple | Strip only wrong-driver same `(mfr,pid)` |
| rx-tx-alternates | EF00+ZCL+raw parallel (`check:p2540`) |
| zigbee40-suzi | Classifier only — no invent Suzi/GP pids |
| air-quality-family | Z2M `TS0601_air_quality_sensor` + airbox → `air_quality_co2`; reinstate `smart_air_detection_box` |

`wouldDegradeCompose` refuses exact dual-case form loss (Contre quoi: aq 52→23 shrink).

## Agent checklist

```
[ ] Enrichment is union/append (variants), not replace
[ ] Sacred couples still on canonical drivers (check:p2519)
[ ] ComplementaryMerge used or equivalent union logic
[ ] test/critical Contre quoi updated (P2469)
[ ] check:p2520 green
[ ] No forum POST
```

## Related

- P2519 anti-regression overwrite lock
- P2490 forum complementary failover
- P2224 complementary enrichment catalogs
- P2570 Johan complementary completion — [`docs/architecture/JOHAN_COMPLEMENTARY_COMPLETION.md`](../architecture/JOHAN_COMPLEMENTARY_COMPLETION.md)
- Sacred couple SSOT (P2494) · identity fields (P2496)
