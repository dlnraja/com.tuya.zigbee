# GitHub Intelligence Extraction

**Date:** 2026-05-24
**Version:** v1.0.0
**Target Repositories:** 
- `JohanBendz/com.tuya.zigbee`
- `dlnraja/com.tuya.zigbee`

## Overview
This document records the results of the automated Deep GitHub Extraction pipeline (`scripts/community-sync/deep-github-extract.js`). The pipeline scrapes Open/Closed Issues, recent Commits, and Pull Requests to identify missing device fingerprints, unmerged patches, and ecosystem updates.

## Fingerprint Intelligence
During the last sync, **81 missing fingerprints** were identified across GitHub Issues and `Zigbee2MQTT`. These were automatically parsed, heuristic-mapped to Homey drivers, and safely injected into `app.json`.

**Highlights of Automatically Integrated Devices:**
- **Contact Sensor:** `_TZE200_seq9cm6u` / `TS0601` (from JohanBendz Issue #1403)
- **3-Gang Switch:** `_TZ3210_n0wbkysi` / `TS0003` (from JohanBendz Issue #1402)
- **Smart Button:** `_TZ3000_yj6k7vfo`, `_TZ3000_b4awzgct` / `TS0041` (from dlnraja Issues #334, #333)
- **Dimmer:** `_TZE200_bxoo2swd` / `TS0601` (from JohanBendz Issue #1404)

## Code & PR Intelligence
### Recent Commits (JohanBendz)
- **Rain Sensor Added:** `Added Rain sensor _TZ3210_tgvtvdoc / TS0207 (#983)`
  *Action Taken:* The pipeline identified this missing fingerprint and synchronized it across the ecosystem.
- Continual updates to `v.0.2.x` branches tracking upstream Tuya core updates.

### Recent Pull Requests
1. **Johan SDK3 Sync — 82 FPs added, 0 DP gaps**
   - Merged extensive fingerprint databases directly from Johan's core branch.
2. **Synchronisation Automatique Johan Benz**
   - CI/CD hooks established to repeatedly pull PRs.
3. **fix: settings page**
   - Addressed UI rendering bugs in local device settings.
4. **Universal Maintenance: Device Variants Synchronisation**
   - Refactored variant naming conventions across 200+ drivers.

## Automation Pipeline
To run this intelligence gathering manually in the future, simply trigger:
```bash
node scripts/community-sync/sync-all.js && node scripts/apply_enriched_fps.js
```
The pipeline bypasses API authentication to scrape public endpoints safely (avoiding 401 Bad Credentials errors from expired local tokens) and relies on `@octokit/rest` for payload parsing.
