
## [2.15.31] - 2025-10-12

### Added
- 10 nouveaux drivers 2024-2025 (Philips Hue, IKEA Thread, Tuya Advanced)
- 40 flow cards (16 triggers, 8 conditions, 16 actions)
- Support Thread/Matter (14 produits)
- Images générées automatiquement (45 PNG)

### Changed
- Description app: 183 drivers (was 167)
- Architecture UNBRANDED complète
- Optimisation taille app (~45 MB)

### Fixed
- Conflit workflow auto-fix-images.yml
- Images manquantes sur page test
- Placeholders supprimés

### Drivers Added
- bulb_white_ac, bulb_white_ambiance_ac
- bulb_color_rgbcct_ac (enriched)
- led_strip_outdoor_color_ac
- doorbell_camera_ac, alarm_siren_chime_ac
- contact_sensor_battery
- wireless_button_2gang_battery, wireless_dimmer_scroll_battery
- presence_sensor_mmwave_battery
- smart_plug_power_meter_16a_ac

### Coverage
- Philips Hue 2025: 5 nouveaux produits
- IKEA Thread: 4 nouveaux produits
- Tuya Advanced: 2 nouveaux produits
- Total devices: 1500+ supported

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.51] - 2025-10-11

### Added - GitHub Actions Integration 🚀
- **Official Homey GitHub Actions** - Using marketplace actions from athombv
  - `athombv/github-action-homey-app-validate` for validation
  - `athombv/github-action-homey-app-update-version` for versioning
  - `athombv/github-action-homey-app-publish` for publication
- **Automated Publishing Workflow** - `homey-official-publish.yml`
  - Automatic validation on push to master
  - Semantic versioning (patch/minor/major)
  - Smart changelog generation from commits
  - Automatic version commit back to repository
- **Continuous Validation Workflow** - `homey-validate.yml`
  - Multi-level validation (debug + publish)
  - JSON syntax checking
  - Driver structure verification
  - Runs on all PRs and development branches
- **PowerShell Publication Script** - `publish-homey-official.ps1`
  - Local publication automation
  - Pre-flight checks
  - Cache cleaning
  - Dry-run mode support

### Documentation
- **Publication Guide** - `PUBLICATION_GUIDE_OFFICIELLE.md` (comprehensive)
- **Quick Start Guide** - `QUICK_START_PUBLICATION.md` (5-minute setup)
- **Workflows Guide** - `.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md`
- **Implementation Recap** - `RECAP_IMPLEMENTATION_OFFICIELLE.md`
- **Technical Reference** - `references/github_actions_official.json`
- **Updated README.md** - With CI/CD pipeline information

### Changed
- Updated version badge to 2.1.51
- Updated project structure documentation
- Enhanced development section with publication methods

## [2.1.40] - 2025-10-11

### Fixed
- **Critical**: Temperature/humidity sensors now display values correctly (Bug #259)
- **Critical**: PIR motion sensors pair without "Unknown Device" conflicts (Bug #256)
- **Bug**: Fixed version mismatch between app.json and package.json
- **Bug**: Restored missing driver.js files for 5 drivers

### Added
- **Feature**: Gas sensor TS0601_gas_sensor_2 support (Bug #261 - community request)
- **Tool**: Ultimate diagnostic and repair script

### Changed
- **Improvement**: Cleaned overlapping manufacturer IDs across drivers
- **Improvement**: Enhanced Zigbee cluster configurations

## [2.1.40] - 2025-10-10

### 🐛 Critical Bug Fixes (Forum Community)

#### Bug #259 - Temperature/Humidity Sensor Not Showing Values (@Karsten_Hille)
- **Fixed**: Temperature and humidity values now display correctly
- **Fixed**: Removed incorrect motion sensor detection
- **Cleaned**: Removed `alarm_motion` and `measure_luminance` capabilities from temp/humidity driver
- **Optimized**: Manufacturer IDs separated by device type (removed button and motion sensor IDs)
- **Enhanced**: Proper attribute reporting configuration (temp, humidity, battery)
- **Corrected**: Zigbee clusters to 1026 (temperature) and 1029 (humidity)

#### Bug #256 - PIR/Buttons Showing as "Unknown Zigbee Device" (@Cam)
- **Fixed**: PIR motion sensors now pair correctly without conflicts
- **Cleaned**: Removed overlapping manufacturer IDs between drivers
- **Separated**: Motion sensor IDs from temperature sensor IDs
- **Optimized**: Product IDs reduced to only TS0202 for PIR sensors
- **Improved**: Device recognition during pairing process

#### Bug #261 - Add Gas Sensor Support (@ugrbnk)
- **Added**: Support for TS0601_gas_sensor_2 variants
- **Enriched**: 5 new manufacturer IDs for gas sensors
  - `_TZE200_ezqy5pvh`, `_TZE204_ezqy5pvh`
  - `_TZE200_ggev5fsl`, `_TZE204_ggev5fsl`
  - `_TZE284_rjgdhqqi`

### 🔧 Technical Improvements
- **Validation**: Homey CLI validation passes at `publish` level
- **SDK3**: Full compliance with Homey SDK3 guidelines
- **Zigbee**: Correct cluster configuration per device type
- **Reporting**: Enhanced attribute reporting intervals and thresholds

### 📚 Documentation
- Added comprehensive corrections report: `FORUM_BUGS_CORRECTIONS_RAPPORT.md`
- Detailed technical notes on manufacturer ID best practices
- Zigbee cluster reference guide

### 🎯 Impact
- ✅ Temperature/humidity sensors work correctly
- ✅ PIR sensors pair without "Unknown Device" error
- ✅ Gas sensor support expanded
- ✅ No more false capability detection
- ✅ Improved device recognition accuracy

## [1.4.1] - 2025-10-07

### Added
- **36 new manufacturer IDs** (+64% increase)
- Zigbee2MQTT database integration (34 IDs)
- Enki (Leroy Merlin) device support (4 devices)
- Forum community requested IDs (17 IDs)
- Deep scraping and analysis tools
- Comprehensive integration scripts
- Professional file organization

### Changed
- Optimized product IDs (removed 1,014 incompatible IDs)
- Improved device recognition accuracy
- Enhanced UNBRANDED categorization
- Updated all documentation to English

### Fixed
- Generic device detection issue
- Temperature sensor misclassification (Post #228)
- ProductId type mismatches (110 drivers cleaned)
- File organization and structure

### Coverage
- Total devices: ~1,200+ (was ~800)
- Manufacturer IDs: 110 (was 67)
- Coverage increase: +50%

## [1.4.0] - 2025-10-07

### Added
- Major cleanup and coherence improvements
- Cascade error auto-fixing
- Forum analysis with NLP + OCR
- Image dimension corrections (163 drivers)

### Fixed
- All validation errors
- Image paths and dimensions
- Driver capabilities
- Build process

## Previous Versions

See [reports/](reports/) for detailed session reports.

---

**Note:** This project follows [Semantic Versioning](https://semver.org/)
