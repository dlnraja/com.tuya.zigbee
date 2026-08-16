# P196 — action prompts + changelog seed + integral land

Date: 2026-08-16  
Prompts applied: CROSS_APP_PROMPT_RULES, per-prompt YAML improvement, operational memory, SESSION_FINALIZE.

## Cross-app

| Finding | Class | Action |
|---|---|---|
| Homey CLI headless publish auto-bumps then dies on missing changelog (`5.12.83`) | BOTH | `ensure-next-changelog.js` before prepare-publish |
| Soak / self-heal / draft poller | BOTH | already on stable P195 |
| OTA `assets/firmware` + tight productIds | BOTH | P194 on master |
| WiFi auto protocol / session IP refresh | MASTER_ONLY | P194 on master only |
| Energy approximation vs measure_power | BOTH | already `energy-compose-gate.js`; now also Unified CI |
| Open issues / PRs / unclaimed human mfrs | — | none / 0 |

## Live

- Test **9.0.563**
- Stable Publish to Draft failed on changelog, promote skipped (Test safe)
