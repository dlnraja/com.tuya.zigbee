# P162 — REFUSE Master Blueprint / overwrite `.cursorrules` (2026-08-16)

## Verdict
**Do not paste this Master Blueprint into `.cursorrules`.**  
**Do not generate `intelligent-triage.js` / auto-patch bots from this pack.**

## Conflicts with living project rules

| Blueprint | Project truth |
|-----------|---------------|
| App “auto-réparatrice” / mutate DP cache | Homey runtime applies **shipped** code; CI publishes; no self-mutating repair bots |
| Shard 11MB `fingerprints.json` | Tip fingerprints ≈ **KB**; OOM = LiveData settings (P148) |
| Mass wipe `_hybrid` | Deprecated **sentinels** stay (P142) |
| Skip **all** battery / all IAS DP | Wrong — Tuya MCU sensors need EF00; tip = skip IAS **without** EF00 |
| `main` / `develop` | **`master` + `stable-v5`** |
| `memory-check.yml` all JSON > 2MB | Superseded by `homey-heap-json-gate.js` |
| Auto-investigate + auto PR workarounds | Invented DP/fixes; refuse (P147/P161) |
| Moving average battery “in SafeCapability” | Battery path = **`BatteryMasterEngine`** (already non-linear + anti-flood) |
| Forum silence via GitHub-only redirect bots | Silent = **no** forum posts; don’t spam issues either |
| Replace `.cursorrules` with OPUS pack | Keep existing `.cursorrules` + dual-app + sacred couple + T157628 |

## Canonical compass (already in repo)
- `.cursorrules` / `AGENTS.md` / `docs/rules/DUAL_APP_VISION.md`  
- `docs/rules/PRAGMATIC_ROADMAP.md`  
- P148 LiveData + sleepy DP · P157/P158 heap gate · P159–P161 refuse packs  

## Answer
“Générer `intelligent-triage.js` maintenant ?” → **No.**
