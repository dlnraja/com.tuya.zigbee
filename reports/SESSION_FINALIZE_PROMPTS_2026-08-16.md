# Session finalize — prompts treated vs deferred (2026-08-16)

## Live Homey Test
- **v9.0.541** build `#2862` channel **test** (Auto-Publish success)
- Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Tip includes: P145 pages/battery/buttons, P146 k4ej3ww2, P147 refuse AI forum pack, P148 LiveData OOM, P149 diag registry

## Treated (this arc)

| Prompt theme | Outcome |
|--------------|---------|
| P145 Pages + battery% + buttons docs | Done + pushed earlier |
| Sacred couple `_TZ3000_k4ej3ww2`+TS0207 | P146 lock + registry |
| Peter crash `96c19859` | Heap OOM → LiveDataUpdater caps (P148) |
| Gmail + Homey diags cross | P149 gate + PresentSky/TBoy registry |
| Publish / draft→Test | **9.0.541 on Test** |
| Branding Universal Tuya / air_purifier deprecate | P142 checklist held |
| Forum silent + optional Peter draft | Draft in `reports/P148_FORUM_DRAFT_PETER.txt` (paste manually; use 9.0.541) |
| Energy virtual layer clarity | `VirtualEnergyMeterMixin` header + layers doc (this commit) |

## Explicitly refused / deferred

| Item | Why |
|------|-----|
| Full rewrite all caps/flows/Johan branches | Infinite debt — layer-by-layer only |
| AI forum roadmap / Unified Engine post | T157628 |
| `generate-patch.js` / auto Homey.Driver from Z2M | Wrong SDK, unsafe merge |
| Homey-runtime self-repair bots | Fixes = code + CI publish; runtime applies patches only |
| BIOS / Deezer / Xpeng / unrelated chat titles | Out of scope |
| Spam Athom republish on processing_failed | P139 |

## Next layers (same style)
1. Soak Peter on **9.0.541** (new diag if crash)
2. Flow-card ID hygiene audit (report-only first)
3. Mains energy compose gate (`approximation` vs measure_power) CI warn
4. Stable-v5 surgical backport of OOM + sacred couples only
