# Scripts Directory Structure

## Overview
All scripts are **excluded from Homey deployment** via .homeyignore.
Only lib/, drivers/, pp.js, pp.json, settings/, locales/, ssets/, .homeycompose/ go to Homey.

## Directory Map

### scripts/lib/ - Shared Utilities (factory pattern)
- drivers.js - loadAllDrivers(), loadFingerprints(), findConflicts(), writeDriverJson()
- etch.js - HTTP fetch with retries, redirects, timeout
- logger.js - createLogger() with error/warning counters

### scripts/automation/ - CI/CD Scripts (used by GitHub Actions)
Referenced by .github/workflows/*.yml - **do not rename without updating workflows**.
- etch-z2m-fingerprints.js - Weekly Z2M fingerprint sync
- uto-add-fingerprints.js - Safe fingerprint auto-add
- ix-fingerprint-conflicts.js - Conflict detection and resolution
- alidate-drivers.js - YAML/JS consistency checker
- udit-flowcards.js - Flow card validator
- udit-capabilities.js - Capability auditor
- lint-collisions.js - mfr+pid collision detector
- generate-matrix.js - Device matrix doc generator
- monthly-scan.js - Forum and PR scanner
- sync-changelog-readme.js - Changelog/README sync
- uto-replace-images.js - Driver image updater

### scripts/sync/ - External Source Crawlers
- crawl-z2m.js, crawl-zha.js, crawl-blakadder.js, crawl-deconz.js
- cross-reference.js - Cross-source fingerprint matching
- un.js - Orchestrator
- lib/ - device-types.js, drivers.js (re-exports shared lib), fetch.js
- data/ - Cached crawl results (JSON)

### scripts/community-sync/ - Community Fingerprint Sync
Referenced by monthly workflows.
- sync-all.js, generate-report.js, parse-issues.js

### scripts/maintenance/ - Deploy & Publish Helpers
- sync-app-json.js - Referenced by validate.yml workflow
- publish-now.ps1, publish-automated.ps1, uto-push.ps1
- dd-changelog-entry.ps1, uto-create-pr.sh
- ix-large-images.js

### scripts/validation/ - Quality Checks (local dev)
- udit-anti-generic.js, check-driver-collisions.js, check-pairing-collisions.js

### scripts/analysis/ - Deep Analysis Scripts (local dev)
- Manufacturer case fixes, flow analysis, forum analysis, orphan research

### scripts/legacy/ - Archived One-Shot Scripts
Historical fix/restore scripts from previous audit sessions. Not actively used.

### scripts/data/ - Script Data Files
JSON/CSV artifacts from past runs. Not used at runtime.

### scripts/regen-images.js - Image Regenerator
Referenced by uto-publish-on-push.yml - kept at scripts/ root.
