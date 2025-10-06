# Universal Tuya Zigbee Device Hub

Professional Zigbee device integration for Homey - 550+ devices supported locally.

## Project Structure

```
tuya_repair/
├── drivers/          # 164 Zigbee device drivers (organized by function)
├── tools/            # Development and automation scripts
├── references/       # Documentation, reports, and enrichment data
├── project-data/     # Build artifacts, logs, and analysis results
├── ultimate_system/  # Advanced automation and orchestration
├── .github/          # CI/CD workflows and automation
└── settings/         # App configuration UI
```

## Quick Start

```bash
# Install dependencies
npm install

# Validate app
homey app validate --level=publish

# Run app
homey app run
```

## Documentation

- [Scripts Documentation](./references/documentation/README_SCRIPTS.md)
- [Addon Enrichment Guide](./references/documentation/ADDON_ENRICHMENT_QUICKSTART.md)
- [Final Reports](./references/reports/)

## Development

All development scripts are located in `tools/` and `ultimate_system/`.

## Statistics

- **164 drivers** organized by device function
- **550+ Zigbee devices** supported
- **100% local** - no cloud dependencies
- **SDK3 compliant** - latest Homey standards

---

*Organized according to UNBRANDED principles - devices categorized by FUNCTION, not brand.*
