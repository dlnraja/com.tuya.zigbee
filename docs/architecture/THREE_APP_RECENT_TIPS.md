# Three-app recent tips (2026-09-23)

Pointers for agents after P2683–P2689. Machine tracks: [`dual-app-tracks.json`](../../config/architecture/dual-app-tracks.json).

| Patch | Tag | Universal | Bastien | Stable | Docs / SSOT |
|-------|-----|-----------|---------|--------|-------------|
| P2683–P2686 Bastien TS004x UX / pile / hold-release / TRV keep | BOTH | ≥9.0.1193 | ≥1.0.64 | ≥5.12.307 | sleepy + sacred-keep |
| P2687 interaction Flow cards partout | MASTER_ONLY | ≥9.0.1194 | ≥1.0.65 | — | [`INTERACTION_FLOW_CARDS_SSOT.md`](./INTERACTION_FLOW_CARDS_SSOT.md) |
| P2689 adaptive battery precision | BOTH | ≥9.0.1195 | ≥1.0.66 | ≥5.12.308 | [`BATTERY_SSOT.md`](./BATTERY_SSOT.md) + `battery-adaptive-precision-ssot.json` |

Gates: `npm run check:p2687` · `npm run check:p2689` · `npm run check:p2685` · `npm run check:p2686` · `npm run check:p2500`.

Silent enrich only — never forum POST (T157628).
