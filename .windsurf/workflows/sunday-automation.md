---
description: Sunday automation - triage GitHub, scan forks, scan forum
---
# Sunday Automation
## Runs every Sunday 07:00 UTC via sunday-master.yml
1. Triage JohanBendz issues/PRs (multi-driver aware: shows all matching drivers per FP)
2. Triage dlnraja issues/PRs
3. Scan all forks for new fingerprints
4. Cross-driver gap detection (sensors, switches - flags FPs in 2+ drivers but missing from sibling)
5. Scan forum for device requests (topics: 140352 dlnraja test, 26439 JohanBendz main, 146735 Tuya Smart Life, 89271 Device Request Archive)
6. Forum auto-respond: replies to forum posts with device support status (requires DISCOURSE_API_KEY secret)
## Auto-respond on new issues/PRs via auto-respond.yml
## Auto-post release notes on forum via publish.yml (requires DISCOURSE_API_KEY secret)
## Key rule: same manufacturerName can appear in multiple drivers (different productIds)
## Manual: Actions tab > Sunday Master Automation > Run workflow
## Setup: Add DISCOURSE_API_KEY secret from https://community.homey.app admin or user API key
