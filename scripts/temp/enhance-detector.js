const fs = require('fs');
const path = require('path');

// Extract recent bug patterns to enhance intelligent-bug-detector.js
const bugDetectorFile = '.github/scripts/intelligent-bug-detector.js';
let content = fs.readFileSync(bugDetectorFile, 'utf8');

const newPatterns = `
  // v6.0 Updates: Radiators & Power Source
  {
    id: 'trv_mapping_missing',
    keywords: ['trv', 'radiator', 'valve', 'thermostat', 'schedule', 'boost', 'eco'],
    matchTitle: true,
    matchBody: true,
    category: 'missing_dp',
    template: 'trv_comprehensive_update'
  },
  {
    id: 'wifi_besterm_issue',
    keywords: ['besterm', 'wifi radiator', 'local api', 'tuyapi', 'disconnect'],
    matchTitle: true,
    matchBody: true,
    category: 'wifi_local',
    template: 'wifi_radiator_local_fix'
  },
  {
    id: 'battery_mains_conflict',
    keywords: ['battery', 'mains', 'usb', 'remove capability', 'always 100%'],
    matchTitle: true,
    matchBody: true,
    category: 'capability_error',
    template: 'power_source_intelligence_fix'
  }
`;

if (!content.includes('trv_mapping_missing')) {
  // Find where to insert new patterns
  const insertMarker = "const BUG_PATTERNS = [";
  content = content.replace(insertMarker, insertMarker + newPatterns);
  
  // Add new templates
  const templateMarker = "const TEMPLATES = {";
  const newTemplates = `
  trv_comprehensive_update: \`###  Radiator/TRV Driver Updated

Good news! In version **v6.0.0**, we have introduced a comprehensive Zigbee TRV driver.
This driver now supports:
- Full scheduling (Monday-Sunday)
- Boost, Eco, and Frost Protection modes
- Window detection & Child lock
- Temperature calibration

Please update to the latest test version and re-pair your device to access these features.
 [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\`,

  wifi_radiator_local_fix: \`###  WiFi Radiator Local Control

In version **v6.0.0**, we've added a dedicated **WiFi Tuya Radiator** driver with local API support.
This driver is compatible with Besterm and other Tuya WiFi radiators, communicating locally without the cloud.

Ensure you have your \`device_id\` and \`device_key\` (Local Key) configured in the device settings.
 [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\`,

  power_source_intelligence_fix: \`###  Intelligent Power Source Detection

We have completely overhauled how battery and mains-powered devices are handled in **v6.0.0**.
The app now dynamically detects the true power source using ZCL attributes and Tuya DPs. 
This resolves issues where mains-powered devices incorrectly displayed a battery capability, or vice-versa.

Please update to the latest test version, and the capability should correct itself (you may need to restart the app or re-pair the device).
 [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\`,
`;
  
  content = content.replace(templateMarker, templateMarker + newTemplates);
  fs.writeFileSync(bugDetectorFile, content);
  console.log(' Enhanced intelligent-bug-detector.js with v6.0 patterns');
} else {
  console.log('Patterns already exist in intelligent-bug-detector.js');
}
