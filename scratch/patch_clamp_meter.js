const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'drivers', 'power_clamp_meter', 'device.js');
let content = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Patch onNodeInit Phase 3 removal
const target1 = `    await this._setupTuyaDP(zclNode);
    await this._setupElectricalMeasurement(zclNode);

    const profile = this.meterProfile;
    this.log(\`[METER] v5.7.9  Ready (profile: \${profile}, mfr: \${this._cachedMfr || 'unknown'})\`);
  }`;

const replacement1 = `    await this._setupTuyaDP(zclNode);
    await this._setupElectricalMeasurement(zclNode);

    const profile = this.meterProfile;
    if (profile === 'pj1203a') {
      if (this.hasCapability('measure_power.phase3')) {
        this.log('[METER] 2-channel bidirectional profile detected. Removing Phase 3 capability.');
        await this.removeCapability('measure_power.phase3').catch(this.error);
      }
    }
    this.log(\`[METER] v5.7.9  Ready (profile: \${profile}, mfr: \${this._cachedMfr || 'unknown'})\`);
  }`;

// 2. Patch Case 110/111 scaling
const target2 = `      case 110: // Power factor A (÷100)
        if (this.hasCapability('measure_power_factor')) {
          this.setCapabilityValue('measure_power_factor', smartParse(value, null, { capability: 'measure_temperature' })).catch(this.error);
        }
        this.log(\`[PJ1203A]  Power Factor A: \${value/100}\`);
        break;

      case 111: // AC frequency (Hz ÷100)
        if (this.hasCapability('measure_frequency')) {
          this.setCapabilityValue('measure_frequency', smartParse(value, null, { capability: 'measure_temperature' })).catch(this.error);
        }
        this.log(\`[PJ1203A]  AC Frequency: \${value/100} Hz\`);
        break;`;

const replacement2 = `      case 110: // Power factor A (÷100)
        if (this.hasCapability('measure_power_factor')) {
          this.setCapabilityValue('measure_power_factor', safeDivide(value, 100)).catch(this.error);
        }
        this.log(\`[PJ1203A]  Power Factor A: \${value/100}\`);
        break;

      case 111: // AC frequency (Hz ÷100)
        if (this.hasCapability('measure_frequency')) {
          this.setCapabilityValue('measure_frequency', safeDivide(value, 100)).catch(this.error);
        }
        this.log(\`[PJ1203A]  AC Frequency: \${value/100} Hz\`);
        break;`;

// 3. Patch Case 121 scaling
const target3 = `      case 121: // Power factor B (÷100)
        if (this.hasCapability('measure_power_factor')) {
          this.setCapabilityValue('measure_power_factor', smartParse(value, null, { capability: 'measure_temperature' })).catch(this.error);
        }
        this.log(\`[PJ1203A]  Power Factor B: \${value/100}\`);
        break;`;

const replacement3 = `      case 121: // Power factor B (÷100)
        if (this.hasCapability('measure_power_factor')) {
          this.setCapabilityValue('measure_power_factor', safeDivide(value, 100)).catch(this.error);
        }
        this.log(\`[PJ1203A]  Power Factor B: \${value/100}\`);
        break;`;

if (!content.includes(target1)) {
  console.error("Error: Target 1 not found!");
  process.exit(1);
}
if (!content.includes(target2)) {
  console.error("Error: Target 2 not found!");
  process.exit(1);
}
if (!content.includes(target3)) {
  console.error("Error: Target 3 not found!");
  process.exit(1);
}

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Successfully patched device.js!");
