# VicHY / Michaelp T140352 treat — master 2026-09-24

Silent only. No forum POST (T157628). Dylan already replied #2256 « I will Check asap ».

## Posts
| Post | User | Symptom | Fix |
|------|------|---------|-----|
| #2255 | VicHY | Advanced Flows lag; presence cards disappear/reload | **P2712** dirty heal + 10min interval (was 60s storm) |
| #2254 | VicHY | frozen lux/presence → curtain | existing P257x/P2587 + quieter heal still strips on dirty |
| #2253 | Michaelp | ogx8u5z6 TRV null caps / `tuya.datapoint value` | **P2593+P2711** already on tip ≥9.0.1220 |
| #2244–#2252 | VicHY/Michaelp | curtain flip / sticky | prior P2546–P2599; tip ≥**9.0.1221** |

## Contre quoi
- `npm run check:p2712`
- `npm run check:p2546` (interval must be 600_000)

## Tip
Master **9.0.1221** — update Universal Tuya Test, restart Homey app (or Repair radars once). Advanced Flows should stop thrashing.
