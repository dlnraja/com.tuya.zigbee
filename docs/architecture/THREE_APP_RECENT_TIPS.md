# Three-app recent tips (2026-09-23)

Pointers for agents after P2683â€“P2692. Machine tracks: [`dual-app-tracks.json`](../../config/architecture/dual-app-tracks.json).

| Patch | Tag | Universal | Bastien | Stable | Docs / SSOT |
|-------|-----|-----------|---------|--------|-------------|
| P2683â€“P2686 Bastien TS004x UX / pile / hold-release / TRV keep | BOTH | â‰¥9.0.1193 | â‰¥1.0.64 | â‰¥5.12.307 | sleepy + sacred-keep |
| P2687 interaction Flow cards partout | MASTER_ONLY | â‰¥9.0.1194 | â‰¥1.0.65 | â€” | [`INTERACTION_FLOW_CARDS_SSOT.md`](./INTERACTION_FLOW_CARDS_SSOT.md) |
| P2689 adaptive battery precision | BOTH | â‰¥9.0.1195 | â‰¥1.0.66 | â‰¥5.12.308 | [`BATTERY_SSOT.md`](./BATTERY_SSOT.md) |
| P2690 ceiling radar cold-stream lux/distance (GH#550) | BOTH | â‰¥9.0.1196 | â€” | â‰¥5.12.309 | presence_sensor_radar find_switch |
| P2691 sleepy remote powerCfg TX calm (Bastien pile drain) | BOTH | â‰¥9.0.1197 | â‰¥1.0.67 | â‰¥5.12.310 | diag 885a9901 |
| P2692 publish heal (heobianâ‰¡hobeian + ZG-301Z couple + energy approx) | BOTH | â‰¥9.0.1198 | â‰¥1.0.68 | â‰¥5.12.311 | Auto-Publish unblock |
| P2693 Bastien TS0043/TS0042 snappy + no ghost canaux | BOTH | ≥9.0.1199 | ≥1.0.69 | ≥5.12.312 | Flow not Zigbee channels |
| P2724–P2727 Bastien house fleet + tip-lag heal | Bastien | — | ≥1.0.99 (#109) | — | prune + SVG + early purge |
| P2728 heobian≡hobeian in fp-collision-check | BOTH | ≥9.0.1243 | — | backport CI script | Unified CI green |

**Athom tip emails (2026-09-25):** Universal `#3363` · Bastien `#109` · Stable `#244` — all testing OK. Bastien Homey Pro may still show 1.0.93 until owner Install Test.

Gates: `npm run check:p2691` · `npm run check:p2692` · `npm run check:p2728` · `npm run check:publish`.

Silent enrich only — never forum POST (T157628).
