---
description: Sunday automation - triage GitHub, scan forks, scan forum
---
# Sunday Automation
## Runs every Sunday 07:00 UTC via sunday-master.yml
1. Triage JohanBendz issues/PRs (multi-driver aware: shows all matching drivers per FP)
2. Triage dlnraja issues/PRs
3. Scan all forks for new fingerprints
4. Cross-driver gap detection (sensors, switches - flags FPs in 2+ drivers but missing from sibling)
5. Scan forum for device requests (topics: 140352 dlnraja test + 26439 JohanBendz main)
## Auto-respond on new issues/PRs via auto-respond.yml
## Key rule: same manufacturerName can appear in multiple drivers (different productIds)
## Manual: Actions tab > Sunday Master Automation > Run workflow
