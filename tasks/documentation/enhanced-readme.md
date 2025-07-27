# Universal Tuya ZigBee Device Integration

## Enhanced Features

### Zigbee Cluster Referential System
- **Monthly Updates**: Automated cluster information updates
- **AI Analysis**: Intelligent device recognition and template generation
- **Source Integration**: Espressif, Zigbee Alliance, CSA IoT, NXP, Microchip, Silicon Labs

### Device Support Matrix
| Device Type | Status | Functions | Notes |
|-------------|--------|-----------|-------|
| Basic Switch | ✅ Supported | On/Off | Full support |
| Dimmable Light | ✅ Supported | On/Off, Dim | Full support |
| Color Light | ✅ Supported | On/Off, Dim, Color | Full support |
| Sensor | 🔄 In Progress | Temperature, Humidity | Partial support |

### Installation
```bash
npm install
npm run build
npm run run
```

### Usage
1. Install the app on your Homey
2. Add your Tuya ZigBee devices
3. Devices will be automatically recognized and configured

### Troubleshooting
- Check device compatibility in the matrix
- Verify cluster support
- Review logs for detailed information

### Contributing
1. Fork the repository
2. Create a feature branch
3. Add your device support
4. Submit a pull request

## Changelog

### Version 1.0.16
- Added Zigbee cluster referential system
- Implemented AI-powered device analysis
- Enhanced documentation and templates
- Monthly automated updates

### Version 1.0.15
- GPMACHADO integration
- ChatGPT processing
- YOLO mode optimization
- Multi-language support

## Support
- GitHub Issues: [Report bugs](https://github.com/dlnraja/com.universaltuyazigbee.device/issues)
- Community: [Homey Community](https://community.homey.app)
- Documentation: [Wiki](https://github.com/dlnraja/com.universaltuyazigbee.device/wiki)

