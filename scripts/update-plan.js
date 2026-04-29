#!/usr/bin/env node
'use strict';
const fs = require('fs');
let c = fs.readFileSync('GLOBAL_IMPROVEMENT_PLAN.md', 'utf8');
const section = `

## v7.4.19 Dual-Version Strategy (2026-04-29)

### Stable vs Test Channel
| Channel | Version | Status | Notes |
|---------|---------|--------|-------|
| **Main (Stable)** | v5.11.205 | Production | Proven stable, all devices working |
| **Test (Beta)** | v7.4.18+ | Development | New features, 315 drivers, 22400+ FPs |

### Rationale
- v5.11.205 is battle-tested and works well for users
- v7.x has major architectural changes (_hybrid removal, SDK3 compliance)
- Users can choose stability vs latest features
- v7.x gets continuous improvement in test channel

### Promotion Flow
1. v7.x changes pushed to master (auto-validation)
2. Weekly draft-to-test promotion via tuya-automation-hub
3. Users test v7.x in test channel
4. When stable, promote v7.x to main channel
5. v5.11.205 remains as fallback

### Silent Operation
- All enrichment done without forum notification
- Project continues silently
- Users informed via GitHub issues/PRs only
`;
c += section;
fs.writeFileSync('GLOBAL_IMPROVEMENT_PLAN.md', c);
console.log('Added dual-version strategy to GLOBAL_IMPROVEMENT_PLAN.md');