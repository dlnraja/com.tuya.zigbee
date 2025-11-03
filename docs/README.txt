================================================================================
UNIVERSAL TUYA ZIGBEE - README
================================================================================

Version: 4.10.0 (Phase 2 - Intelligent System)
Last Updated: 2025-11-03
Status: PRODUCTION READY
SDK: Homey SDK v3
New: Intelligent Protocol Router, BSEED Fix, HOBEIAN Support

================================================================================
QUICK START
================================================================================

1. INSTALLATION

   Via Homey App Store:
   - Search for "Universal Tuya Zigbee"
   - Click Install

   Via GitHub:
   - git clone https://github.com/dlnraja/com.tuya.zigbee.git
   - cd com.tuya.zigbee
   - npm install
   - npx homey app install

2. DEVICE SUPPORT

   - 173 Drivers (all validated SDK3)
   - 2,000+ Manufacturer IDs
   - 1,500+ Product IDs
   - 100% Local Zigbee (no cloud required)

3. DEVICE CATEGORIES

   1. Motion & Presence Detection
   2. Contact & Security
   3. Temperature & Climate
   4. Smart Lighting
   5. Power & Energy
   6. Safety & Detection
   7. Automation Control
   8. Curtains & Blinds

================================================================================
PHASE 2 NEW FEATURES (v4.10.0)
================================================================================

1. INTELLIGENT PROTOCOL ROUTER
   - Automatically detects Tuya DP vs native Zigbee
   - Routes commands to optimal protocol
   - Fixes BSEED multi-gang switches
   - Supports hybrid Tuya/Zigbee devices

2. BSEED DEVICE SUPPORT
   - Automatic BSEED device detection
   - Tuya DP protocol for proper gang control
   - Fixes issue where all gangs activate together
   - Email response system for user support

3. HOBEIAN MANUFACTURER
   - ZG-204ZV Multisensor support
   - PIR + mmWave motion detection
   - Temperature, Humidity, Illuminance
   - IAS Zone enrollment
   - Added to manufacturer database

4. DEVICE FINDER ENHANCEMENT
   - Fixed device-matrix.json loading
   - Working search by name/ID
   - Filter by category/class/brand
   - Manufacturer ID search
   - Product ID search
   - GitHub Pages deployment ready

5. TUYA DATAPOINT ENGINE
   - Complete DP1-32 support
   - Multi-gang switch standard
   - Countdown timers, LED control
   - Backlight, power-on behavior
   - Inching/pulse mode
   - Future: Weekly schedules, random timing

================================================================================
PUBLICATION METHODS
================================================================================

METHOD 1: GitHub Actions (Automatic)
   - git push origin master
   - GitHub Actions auto-validates and publishes
   - See: QUICK_START_PUBLICATION.md

METHOD 2: PowerShell Script (Local)
   - .\scripts\automation\publish-homey-official.ps1
   - See: PUBLICATION_GUIDE_OFFICIELLE.md

METHOD 3: Homey CLI (Direct)
   - npx homey app validate --level publish
   - npx homey app publish

================================================================================
DOCUMENTATION
================================================================================

ESSENTIAL:
- README.md                          - Complete project overview
- CHANGELOG.md                       - Version history
- CONTRIBUTING.md                    - Contribution guidelines
- LICENSE                            - MIT License

PUBLICATION:
- QUICK_START_PUBLICATION.md         - 5-minute setup
- PUBLICATION_GUIDE_OFFICIELLE.md    - Complete guide
- .github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md - Technical workflows

BUG FIXES:
- FORUM_BUGS_CORRECTIONS_RAPPORT.md  - Community fixes (v2.1.40)

IMPLEMENTATION:
- RECAP_IMPLEMENTATION_OFFICIELLE.md - What we built
- DOCUMENTATION_COMPLETE_RECAP.md    - Documentation overview

================================================================================
PROJECT STRUCTURE
================================================================================

/
├── app.json                         164 drivers, 1,767 flow cards
├── drivers/                         164 device drivers
├── scripts/
│   ├── automation/                  Publication scripts
│   ├── analysis/                    Verification scripts
│   ├── fixes/                       Auto-fix scripts
│   └── generation/                  Code generators
├── .github/workflows/               GitHub Actions
│   ├── homey-official-publish.yml   Main workflow
│   └── homey-validate.yml           Validation
├── references/                      Technical references
└── docs/                            Documentation

================================================================================
DEVELOPMENT
================================================================================

1. SETUP

   npm install
   npx homey app validate --level publish

2. LOCAL TESTING

   npx homey app install
   npx homey app run

3. VALIDATION

   npx homey app validate --level debug
   npx homey app validate --level publish

4. ADDING DEVICES

   See: CONTRIBUTING.md (section: Adding New Devices)

================================================================================
SUPPORT
================================================================================

GitHub Issues:
https://github.com/dlnraja/com.tuya.zigbee/issues

Homey Forum:
https://community.homey.app/t/140352/

Documentation:
All .md files in root directory

================================================================================
LICENSE
================================================================================

MIT License - Copyright (c) 2025 Dylan Rajasekaram
Based on Johan Bendz's Tuya Zigbee App (MIT License)

See LICENSE file for details.

================================================================================
STATISTICS
================================================================================

Version: 2.1.51
Drivers: 173 (all validated SDK3)
Manufacturer IDs: 2,000+
Product IDs: 1,500+
Flow Cards: 1,767
Validation Errors: 0
Mode: 100% Zigbee Local
API Key Required: NONE
Publication: Official GitHub Actions
CI/CD: Automated validation & versioning
SDK: 3 (latest)

================================================================================
LINKS
================================================================================

GitHub:
https://github.com/dlnraja/com.tuya.zigbee

Homey Dashboard:
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

Test URL:
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

Live URL:
https://homey.app/a/com.dlnraja.tuya.zigbee/

GitHub Actions:
https://github.com/dlnraja/com.tuya.zigbee/actions

================================================================================
END OF README
================================================================================
