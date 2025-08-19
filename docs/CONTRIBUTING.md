# Contributing Guide

## How to Request Device Support

### 1. Collect Device Information

Pair your device with Homey and collect:
- **Manufacturer Name**: e.g., `_TZ3000_xxxxxxxx`
- **Product ID**: e.g., `TS011F`
- **Endpoints & Clusters**: From Homey Developer Tools

### 2. Monitor DP Values

Watch the device during operation and note DP (Data Point) changes:
- DP 1: Usually on/off
- DP 16: Often power (W/10)
- DP 17: Often energy (kWh/1000)

### 3. Create Manual Entry

Add to `research/manual/your-device.jsonl`:

```json
{
  "manufacturerName": "_TZ3000_xxxxxxxx",
  "productId": "TS011F",
  "typeHints": ["plug", "meter"],
  "capabilityHints": ["onoff", "measure_power", "meter_power"],
  "dpEvidence": {
    "1": "onoff",
    "16": "measure_power/10",
    "17": "meter_power/1000"
  },
  "source": {
    "type": "local_pairing_log",
    "url": "local://homey/logs/2025-01-19",
    "date": "2025-01-19"
  }
}
```

### 4. Run Inference

```bash
npm run ingest   # Process manual data
npm run infer    # Calculate confidence
npm run propose  # Generate overlay
```

### 5. Submit PR

Open a pull request with:
- Your manual entry file
- Generated overlay (if confidence ≥ 0.60)
- Test results

## Code Style

- **ESLint**: `npm run lint`
- **No network in runtime**: Enforced by linter
- **Naming**: kebab-case for drivers, no TSxxxx in names

## Testing

```bash
npm test              # Unit tests
npm run validate:homey # Homey validation
npm run replay        # Test with replay files
```

## Architecture

### Driver Structure
```
drivers/
  <type>-tuya-<variant>/
    driver.compose.json  # Homey Compose definition
    device.js           # Device logic
    assets/            # Images (75x75, 500x500, 1000x1000)
```

### Overlay System
```
lib/tuya/overlays/
  vendors/<manufacturer>/<type>.json
  firmwares/<type>/<version>.json
```

## Pull Request Checklist

- [ ] Code passes `npm run lint`
- [ ] Tests pass `npm test`
- [ ] Validation passes `npm run validate:homey`
- [ ] Manual entry includes DP evidence
- [ ] Overlay has confidence score
- [ ] Commit follows conventional format

## Questions?

- Open an [issue](https://github.com/dlnraja/com.tuya.zigbee/issues)
- Join the [forum discussion](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
