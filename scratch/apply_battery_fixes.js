const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FIXES = [
  {
    file: 'drivers/climate_sensor_gas/device.js',
    target: 'await super.onNodeInit({ zclNode });\n    this._registerCapabilityListeners();',
    replacement: 'await super.onNodeInit({ zclNode });\n    if (this.mainsPowered && this.hasCapability(\'measure_battery\')) {\n      this.log(\'[GAS] Mains powered device detected. Dynamically pruning battery capability...\');\n      await this.removeCapability(\'measure_battery\').catch(() => {});\n    }\n    this._registerCapabilityListeners();'
  },
  {
    file: 'drivers/climate_sensor_smart/device.js',
    target: 'async onNodeInit({ zclNode }) {\n    this.log(\'[SCENE-PANEL] v5.13.5 init\');',
    replacement: 'async onNodeInit({ zclNode }) {\n    await super.onNodeInit({ zclNode }).catch(() => {});\n    if (this.mainsPowered && this.hasCapability(\'measure_battery\')) {\n      this.log(\'[SCENE-PANEL] Mains powered device detected. Dynamically pruning battery capability...\');\n      await this.removeCapability(\'measure_battery\').catch(() => {});\n    }\n    this.log(\'[SCENE-PANEL] v5.13.5 init\');'
  },
  {
    file: 'drivers/sensor_climate_smart/device.js',
    target: 'async onNodeInit({ zclNode }) {\n    this.log(\'[SCENE-PANEL] v5.13.5 init\');',
    replacement: 'async onNodeInit({ zclNode }) {\n    await super.onNodeInit({ zclNode }).catch(() => {});\n    if (this.mainsPowered && this.hasCapability(\'measure_battery\')) {\n      this.log(\'[SCENE-PANEL] Mains powered device detected. Dynamically pruning battery capability...\');\n      await this.removeCapability(\'measure_battery\').catch(() => {});\n    }\n    this.log(\'[SCENE-PANEL] v5.13.5 init\');'
  },
  {
    file: 'drivers/device_air_purifier_quality/device.js',
    target: 'if (this.mainsPowered && this.hasCapability(\'measure_battery\')) {this.log(\'[AIR-QUALITY]  Mains-powered: removed measure_battery\');\n    }',
    replacement: 'if (this.mainsPowered && this.hasCapability(\'measure_battery\')) {\n      this.log(\'[AIR-QUALITY]  Mains-powered: removed measure_battery\');\n      await this.removeCapability(\'measure_battery\').catch(() => {});\n    }'
  }
];

console.log('=== Applying Structural Battery Pruning Fixes ===');

for (const fix of FIXES) {
  const filePath = path.join(ROOT, fix.file);
  if (!fs.existsSync(filePath)) {
    console.error(`[-] File not found: ${fix.file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Normalize line endings to LF for replacement mapping
  const hasCRLF = content.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedTarget = fix.target.replace(/\r\n/g, '\n');
  const normalizedReplacement = fix.replacement.replace(/\r\n/g, '\n');

  if (normalizedContent.includes(normalizedTarget)) {
    let newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
    
    // Re-restore CRLF if original file had them
    if (hasCRLF) {
      newContent = newContent.replace(/\n/g, '\r\n');
    }

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`[+] Successfully patched: ${fix.file}`);
  } else {
    // Try without strict indentation or spacing matching as fallback
    const targetNoSpace = normalizedTarget.replace(/\s+/g, '');
    const contentNoSpace = normalizedContent.replace(/\s+/g, '');
    if (contentNoSpace.includes(targetNoSpace)) {
      console.log(`[!] Target found but spacing mismatched. Manual inspection needed for: ${fix.file}`);
    } else {
      console.log(`[-] Target pattern not found in: ${fix.file}`);
    }
  }
}
console.log('=== Application Finished ===');
