# Contributing to Universal Tuya Zigbee

## Before Contributing

1. Read `DEV_NOTES.md` completely
2. Understand the fingerprinting rules
3. Run validation scripts before submitting

## Adding a New Device

### Step 1: Identify the Device
```bash
# Get device info from Homey Developer Tools
# Note: manufacturerName, modelId (productId), clusters
```

### Step 2: Find the Right Driver
Use the category mapping:
- Switches → `switch_*`
- Plugs → `plug_*`
- Sensors → `climate_sensor`, `motion_sensor`, etc.
- Thermostats → `thermostat_*`

### Step 3: Check for Collisions
```bash
node automation/SAFE_AUDIT.js [driver_name]
node automation/DETECT_COLLISIONS.js
```

### Step 4: Add Fingerprint
Edit `drivers/[driver_name]/driver.compose.json`:
```json
{
  "zigbee": {
    "manufacturerName": ["_TZ3000_newdevice"],
    "productId": ["TS0001", "TS0011"]  // ALL variants!
  }
}
```

### Step 5: Validate
```bash
npx homey app validate --level publish
node automation/DETECT_COLLISIONS.js
```

## Rules Summary

### ✅ DO
- Use (manufacturerName + productId) pairs
- Add ALL productId variants
- Run collision detection
- Test before submitting

### ❌ DON'T
- Add TS0601 alone
- Remove existing manufacturers
- Mix types in arrays
- Skip validation

## Commit Message Format

```
feat: Add support for [device_name]
fix: Resolve collision for [manufacturer]
docs: Update DEV_NOTES
chore: Bump version to X.Y.Z
```

## Pull Request Checklist

- [ ] Read DEV_NOTES.md
- [ ] Device placed in correct category
- [ ] ProductId list is exhaustive
- [ ] No collisions introduced
- [ ] Validation passes
- [ ] Tested on real device (if possible)
