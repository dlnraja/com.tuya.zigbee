# Changelog

## [4.9.276] - 2025-11-04

### EMERGENCY FIX - Critical Issues Resolved

#### Fixed
- **CRITICAL:** Disabled wall_touch driver flow card registration causing app crashes
  - Affected drivers: wall_touch_1gang through wall_touch_8gang
  - Error: "Invalid Flow Card ID: wall_touch_*gang_button1_pressed"
  - All 8 drivers now initialize correctly without errors

#### Known Issues
- Some devices may show `null` capabilities values
  - This is being investigated separately
  - Likely requires device re-pairing or Homey restart
  - Will be addressed in v4.9.277

#### Technical
- Commented out `registerFlowCards()` in wall_touch drivers
- Flow cards need to be properly defined in app.json
- Temporary workaround until flow card structure is fixed

### User Reports Addressed
- Log ID 487badc9: "issue, global" - Wall touch drivers crashing
- Multiple devices showing null capabilities (partial fix)

## [4.9.275] - 2025-11-04

### Fixed
- CRITICAL: Resolved 'Cannot find module ./TuyaManufacturerCluster' error
  - Module path was correct but cache corruption caused deployment issues
  - Cleaned .homeybuild and node_modules for fresh build
  - App now starts correctly on all Homey devices
  - All Tuya cluster registration working properly

### Technical
- Full cache cleanup (node_modules + .homeybuild)
- Fresh npm install with all dependencies
- Validation passed at publish level
- GitHub Actions workflow ready for automatic publication

## [Latest Version]

### Changes and Updates

1. **Refactored Device Drivers**: Simplified device drivers to improve user experience and maintainability.
2. **Unified Driver Logic**: Created a unified driver template to handle different device types and configurations.
3. **Battery Management Improvements**: Enhanced battery reporting and handling for better accuracy and reliability.
4. **SDK3 Compatibility**: Addressed compatibility issues with SDK3 to ensure seamless integration.
5. **Testing and Verification**: Conducted comprehensive testing to verify the functionality and compatibility of refactored drivers.

### Technical Details

* Refactored drivers for various device types, including smart switches, motion sensors, and temperature/humidity sensors.
* Created a `BaseDriver` class to contain common logic and functionality.
* Implemented device-specific logic using inheritance.
* Improved battery management by configuring attribute reporting and enhancing error handling.
* Ensured SDK3 compliance by using standard Zigbee clusters and following best practices.

### Future Work

* Continue monitoring and addressing any issues that arise from the refactored drivers.
* Explore further optimizations for battery management and device performance.
* Document additional changes and updates as they occur.