---
description: Cross-reference all sources at each prompt
---

## Steps

1. Read docs/rules/CRITICAL_MISTAKES.md + docs/MASTER_REFERENCE.md + docs/rules/USER_DEVICE_EXPECTATIONS.md
2. Check all data sources:
   - **GitHub**: issues + PRs from dlnraja/com.tuya.zigbee + JohanBendz/com.tuya.zigbee
   - **Forum**: Homey Community topics (140352, 26439, 146735, 89271, 54018, 12758, 85498)
   - **Gmail**: diagnostics from .github/state/diagnostics-report.json
   - **Device interviews**: docs/data/DEVICE_INTERVIEWS.json + Desktop/interview/
   - **Images**: Gemini Vision analysis of forum/GitHub screenshots
   - **Internet**: Z2M issues, ZHA quirks, Blakadder DB, deCONZ, manufacturer sites
3. Cross-reference fingerprints against all 138 drivers in drivers/*/driver.compose.json
4. Update MASTER_REFERENCE.md, USER_DEVICE_EXPECTATIONS.md, changelog
5. Run 
ode .github/scripts/generate-ai-changelog.js to update CHANGELOG.md, README.md, .homeychangelog.json
6. Email: senetmarne@gmail.com (Outlook cloud) - user pastes relevant content
