# P3034 Phase 1: variables, accepted 9.0.1574 (#3655) vs refused #3656–#3680

Read-only evidence, 25/10/2026 (no upload made).

## Measured facts
- Build list latency (history run 40170072067, HOMEY_API_TIMEOUT_MS=120000; the API returns the whole list whatever `limit` is):
  master 3 680 builds → 19.8 s · stable 393 → 3.0 s · Bastien 217 → 1.5 s. About 5 ms per build, linear.
  At the SDK default of 10 s, the master list *always* times out (runs 40169759677 and 40169918345).
- Master: 25 consecutive processing_failed since 9.0.1575 (21/10 07:10 UTC → 24/10 22:55 UTC); last test = #3655 9.0.1574.
- Before 21/10 master already failed 13/20 (1560–1574) while stable/Bastien mostly passed.
- 9.0.1591 = EXACT 1574 content (29.90 MB / 4 406 files) → AggregateError. Content cannot be the trigger alone.
- Every refused payload is ≤ the accepted 1574 payload (31.35 MB, 4 406 files, app.json 3.63 MB, 6 111 cards).
- Stable 5.12.503 passes with 30.70 MB / 10.51 MB gz (bigger gz than master 1574's 9.20 MB).
- Constant across 1572→HEAD (excluded): compat >=12.2.0, SDK 3, api field, permissions, 55 custom capabilities,
  max string 425, 27 invisible chars, changelog 39 KB, homey CLI 4.4.1 / Node 22, version format.

## Ranking
1. Athom-side per-app state that scales with the build count of com.dlnraja.tuya.zigbee (3 680 builds;
   list 6.7× slower than stable). Not fixable by content; needs a builds clean-up (user's explicit yes and
   Athom feature, unknown) or a lucky timing slot.
2. Upload path: CLI `homey app publish` (master/stable) vs direct-api-publish.js (Bastien primary). One-variable trial.
3. Athom transient degradation / time of day / spacing between uploads.
4. Content (cards, size, drivers, titleFormatted, duplicate ids, .homeyignore, workflow env): excluded by 1591.
5. Version string, api field, changelog, compat: constant, excluded.
