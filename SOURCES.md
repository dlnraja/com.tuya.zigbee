# Data Sources for Homey Tuya Zigbee Project

This document lists all data sources used in the development of this project.

## Zigbee Device Databases

- **Zigbee2MQTT Device Database**: [https://www.zigbee2mqtt.io/supported-devices/](https://www.zigbee2mqtt.io/supported-devices/)
- **Blakadder Zigbee Database**: [https://github.com/blakadder/zigbee](https://github.com/blakadder/zigbee)
- **Zigbee Alliance Device Database**: [https://zigbeealliance.org/](https://zigbeealliance.org/)

## Community Forums

- **Homey Community Forum**: [https://community.homey.app/](https://community.homey.app/)
- **GitHub Issues and Pull Requests**: [https://github.com/johan-benz/homey-tuya-zigbee](https://github.com/johan-benz/homey-tuya-zigbee)

## Open Source Projects

- **Homey Zigbeedriver**: [https://github.com/athombv/homey-zigbeedriver](https://github.com/athombv/homey-zigbeedriver)
- **Zigbee Clusters**: [https://github.com/athombv/zigbee-clusters](https://github.com/athombv/zigbee-clusters)

## Additional Resources

- **Tuya Official Documentation**: [https://developer.tuya.com/](https://developer.tuya.com/)
- **Zigbee Specification**: [https://zigbee.org/](https://zigbee.org/)

## Data Collection Scripts

Our project includes scripts to collect and process data from these sources:

- `scripts/fetch-all-sources.js`: Main orchestrator for data collection
- `scripts/sources/fetch-zigbee2mqtt.js`: Fetches data from Zigbee2MQTT
- `scripts/sources/fetch-blakadder.js`: Fetches data from Blakadder's repository
- `scripts/sources/analyze-forum.js`: Analyzes Homey forum posts
- `scripts/sources/fetch-github-data.js`: Collects GitHub forks, PRs, and issues

## Generated Data Files

The collected data is stored in the following files:

- `resources/zigbee2mqtt-devices.json`: Zigbee2MQTT device list
- `resources/blakadder-devices.json`: Blakadder device list
- `resources/forum-analysis.json`: Analyzed forum posts
- `resources/github/device-contributions.json`: GitHub contributions related to devices

## How to Update Data

To update the data sources, run:

```bash
npm run fetch-all-sources
```

This command will update all data files from their respective sources.
