# Universal Tuya Zigbee - Developer Documentation

## Project Overview
Community-maintained Homey app supporting 150+ generic Tuya Zigbee devices.

## Repository Structure
```
├── drivers/           # 159 device drivers
├── scripts/          # Automation & monitoring tools
├── docs/             # Documentation (this file)
├── refs/             # Reference data & manufacturer IDs
└── app.json          # Homey app manifest
```

## Development Status
- **Active Drivers**: 159 tested and working
- **Manufacturer IDs**: 50+ supported variants
- **GitHub Actions**: Automated testing & deployment
- **Community**: Based on Johan Bendz's MIT licensed work

## Contributing
1. Fork repository
2. Add/modify drivers in `/drivers/`
3. Update manufacturer IDs in driver.compose.json
4. Test locally with `homey app validate`
5. Submit pull request

## Deployment
Automated via GitHub Actions on push to master branch.

---
**Maintainer**: dlnraja | **Original Author**: Johan Bendz | **License**: MIT
