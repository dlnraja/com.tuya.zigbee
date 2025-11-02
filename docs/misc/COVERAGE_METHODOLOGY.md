# 📊 Coverage Methodology

**How We Count and Verify Device Support**

---

## 🎯 Overview

This document explains exactly how we calculate and present device coverage numbers for the Universal Tuya Zigbee app.

**Transparency First:** Every number you see (drivers, variants, health scores) is generated from actual code and validated in CI, not estimates or marketing.

---

## 📈 Key Metrics Explained

### 1. Total Drivers
```
Definition: Physical driver folders in /drivers/ directory
Count Method: fs.readdirSync(driversPath).filter(isDirectory).length
Verification: CI validates each folder has valid driver.compose.json
Current: 183 drivers
```

**What counts as a driver:**
- ✅ Has `/drivers/[name]/` folder
- ✅ Contains `driver.compose.json`
- ✅ Passes schema validation
- ✅ Has required fields (id, name, class, zigbee)

**What does NOT count:**
- ❌ Template folders
- ❌ Deprecated/archived drivers
- ❌ Folders without valid compose file

### 2. Device Variants
```
Definition: Sum of all manufacturer IDs across all drivers
Count Method: Sum of driver.zigbee.manufacturerName[] lengths
Calculation: Each driver can support multiple manufacturer IDs
Current: Variable (depends on driver composition)
```

**Example:**
```javascript
// Driver: smart_plug_ac
{
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_8nkb7mof",  // MOES
      "_TZ3000_g5xawfcq",  // LSC
      "_TZ3000_vzopcetz"   // Nedis
    ]
  }
}
// This counts as 1 driver but 3 device variants
```

**Why this matters:**
- One driver can support dozens of "white-label" devices
- Users buy devices by brand, not driver name
- Shows real-world device compatibility

### 3. Categories
```
Definition: Functional groupings of drivers
Source: DRIVER_CATEGORIES.json (auto-generated)
Method: Pattern matching + manual verification
Current: 14 categories
```

**Category List:**
- Lighting (bulbs, strips, controllers)
- Switches (wall switches, dimmers)
- Plugs (smart plugs, energy monitoring)
- Sensors (motion, contact, climate, safety)
- Security (sirens, locks, doorbells)
- Climate (thermostats, TRVs, HVAC)
- Motors (curtains, blinds, valves)
- Buttons (remotes, scene controllers)
- Specialized (fans, irrigation, etc.)

### 4. Health Score
```
Definition: Percentage of drivers with valid schemas
Formula: (valid_drivers / total_drivers) * 100
Validation: homey app validate --level publish
Current: Calculated in CI every commit
```

**What "valid" means:**
- ✅ Passes Homey CLI validation
- ✅ Required fields present
- ✅ Valid JSON syntax
- ✅ Zigbee configuration correct
- ✅ Capabilities properly defined

### 5. Brands Supported
```
Definition: Manufacturer brands extracted from device data
Method: Parse manufacturerName, model IDs, and database
Source: utils/manufacturer-database.js + driver data
Current: 10+ major brands
```

**Brand List:**
- MOES
- Nous
- LSC Smart Connect (Action)
- Nedis SmartLife
- Lidl Smart Home
- Silvercrest
- BlitzWolf
- Amazon Basics
- Generic Tuya OEM
- And more...

---

## 🔍 Verification Process

### Automated CI Validation
Every commit runs:
```yaml
1. Schema Validation
   - Check all driver.compose.json files
   - Verify required fields
   - Validate JSON syntax
   
2. Homey Validation
   - Run: homey app validate --level publish
   - Must pass to merge
   - Results published as artifacts
   
3. Coverage Report
   - Generate device matrix
   - Calculate statistics
   - Create dashboard
   - Upload as build artifacts
```

### Manual Verification
```
1. Device Request Process
   - User submits via GitHub template
   - Requires Z2M link or fingerprint
   - Community testing required
   
2. Status Levels
   - Proposed: Added via Z2M data, untested
   - Confirmed: Tested by real users
   - Validated: Extensively tested, no issues
```

---

## 📋 Data Sources

### Primary Sources
1. **Actual Codebase**
   - `/drivers/` directory (183 drivers)
   - `driver.compose.json` files
   - `manufacturerName[]` arrays

2. **Zigbee2MQTT Database**
   - Device fingerprints
   - Manufacturer IDs
   - Capability mappings
   - Source: https://zigbee2mqtt.io/supported-devices/

3. **Community Testing**
   - Forum reports
   - GitHub issues
   - User diagnostics
   - Source: https://community.homey.app/

### Secondary Sources
4. **Manufacturer Documentation**
   - Spec sheets
   - Zigbee Alliance IDs
   - Product catalogs

5. **Reverse Engineering**
   - Actual device testing
   - ZCL cluster analysis
   - Attribute discovery

---

## 🎯 Coverage Claims - How We Back Them Up

### Claim: "183 Drivers"
**Proof:**
```bash
ls -d drivers/*/ | wc -l
# Output: 183
```
**CI Artifact:** `validation-report.txt`

### Claim: "Device Variants"
**Proof:**
```javascript
// Script: generate-coverage-stats.js
drivers.forEach(d => {
  variants += d.zigbee.manufacturerName.length;
});
```
**CI Artifact:** `COVERAGE_STATS.json`

### Claim: "96% Health Score"
**Proof:**
```bash
homey app validate --level publish
# Must show: "validated successfully"
```
**CI Artifact:** `validation-output.txt`

### Claim: "100% Local, No Cloud"
**Proof:**
```javascript
// No network calls in code
// No API keys required
// Pure Zigbee ZCL communication
// Verifiable by code audit
```

---

## 🔄 How Numbers Are Updated

### Automatic (Every Commit)
```
1. CI runs on push
2. Scripts generate reports
3. Coverage stats calculated
4. Device matrix regenerated
5. Dashboard updated
6. Artifacts uploaded
```

### Manual (Monthly)
```
1. Database expansion
2. Brand list updates
3. Methodology documentation
4. Known issues review
```

---

## 📊 Coverage Gaps & Honesty

### What We DON'T Count
❌ **Theoretical devices** - Only include devices in actual drivers  
❌ **Untested devices** - Mark as "proposed" until confirmed  
❌ **Deprecated drivers** - Remove from active count  
❌ **Template/example code** - Not included in stats  

### Known Limitations
⚠️ **Coverage is not 100%** - Tuya makes thousands of devices  
⚠️ **Some devices need testing** - "Proposed" status exists for a reason  
⚠️ **Firmware variations** - Same model, different firmware = different behavior  
⚠️ **Regional differences** - EU vs US vs CN variants may differ  

---

## 🤝 Community Contributions

### How You Can Verify
1. **Clone the repo**
   ```bash
   git clone https://github.com/dlnraja/com.tuya.zigbee.git
   cd com.tuya.zigbee
   ```

2. **Count drivers yourself**
   ```bash
   ls -d drivers/*/ | wc -l
   ```

3. **Run validation**
   ```bash
   npm install -g homey
   homey app validate --level publish
   ```

4. **Generate reports**
   ```bash
   node scripts/automation/generate-coverage-stats.js
   node scripts/automation/generate-device-matrix.js
   ```

### How to Challenge Numbers
- Open GitHub issue with evidence
- We'll investigate and correct
- Transparency is our priority

---

## 🎯 Summary

**Our Promise:**
- All numbers are **generated from code**, not marketing
- Every metric is **verifiable** via CI artifacts
- We're **honest about limitations**
- Coverage is **continually validated**
- Community can **audit everything**

**Key Takeaway:**
> If you can't verify it in CI or by cloning the repo, we don't claim it.

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}  
**CI Dashboard:** [View Latest Build](https://github.com/dlnraja/com.tuya.zigbee/actions)  
**Device Matrix:** [DEVICE_MATRIX.md](./DEVICE_MATRIX.md)
