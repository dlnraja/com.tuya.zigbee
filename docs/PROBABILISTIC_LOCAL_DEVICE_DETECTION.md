# Probabilistic Local Device Detection - 2026-07-05

This reference defines the local heuristic detection layer used for unknown devices and migration recommendations.

## Goal

Device routing must not rely on a single broad identifier such as `TS0601`. The detector should cross-check local databases, fingerprints, clusters, DP behavior, and learning reports, then return ranked candidates with confidence and reasons.

## Evidence Sources

- Compound fingerprint database: exact `manufacturerName|productId` routes.
- Runtime fingerprint catalog: broad manufacturer/model catalog from `data/fingerprints.json`.
- Driver mapping database: `mfr_index`, `pid_index`, and driver capability metadata.
- MFS/community databases: harvested source aggregation and enriched forum/GitHub rows.
- Zigbee cluster behavior: endpoints, standard clusters, Tuya EF00, battery and energy clusters.
- Tuya DP behavior: observed DP IDs and `data/dp_database.json` capability hints.
- 15 minute DP learning report: `dp_auto_discovery_report` profile, capabilities, and dynamic DP map.

## Rules

1. Exact compound fingerprints are strong evidence, but behavior can still add contradictions.
2. Broad product IDs such as `TS0601` are weak priors only.
3. Observed DP and cluster behavior may lift an unknown variant into a specific family.
4. Generic fallback drivers receive a penalty when a more specific driver has supporting evidence.
5. Contradictions must reduce confidence, not be hidden.
6. The output must keep ranked alternatives for manual review.
7. Migration can use the probabilistic result only when confidence is at least 70%.
8. A confidence below 70% is a learning/reporting signal, not an auto-route.

## Output Fields

- `suggestedDriver`: best ranked driver.
- `confidence`: bounded 0-99 confidence score.
- `probability`: relative probability of the best candidate among ranked candidates.
- `candidates`: ranked alternatives with sources, evidence, contradictions, capabilities, and probability.
- `evidenceBadges`: compact debug labels such as `multi_source_agreement`, `dp_behavior_seen`, or `close_race_manual_review`.
- `observed`: normalized manufacturer/model, endpoint count, clusters, DP IDs, capabilities, and inferred device types.

## Safety

The detector is local-first and lazy-loaded. Databases are read only when detection is requested, not at app startup. Every optional source is guarded so a bad cache or missing file cannot crash pairing, unknown-device reporting, or migration analysis.
