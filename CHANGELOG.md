# Changelog

All notable changes to this project will be documented in this file.

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
