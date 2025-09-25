# Ultimate Zigbee Hub - Sources & References

## Primary Sources

### Johan Benz Standards
- **Tuya Zigbee App**: https://homey.app/a/com.tuya.zigbee/test
- **Design Principles**: Professional device icons, comprehensive flow cards, proper support links
- **Organization**: Clean app page with coherent device naming, multiple manufacturer IDs
- **Quality Standards**: Professional changelog formatting, extensive device coverage

### Homey SDK3 Guidelines
- **Official Documentation**: https://apps.developer.homey.app/
- **Image Requirements**: App (250x175/500x350/1000x700), Driver (75x75/500x500/1000x1000)
- **Validation Requirements**: Numeric clusters, valid driver classes, energy arrays
- **Architecture**: Local Zigbee operation, native OTA support

### External Device Databases
- **Zigbee2MQTT**: https://zigbee2mqtt.io/supported-devices/
- **Blakadder Database**: https://zigbee.blakadder.com/
- **GitHub Issues**: Device requests and compatibility reports
- **AliExpress**: User-reported device identifiers

### Community Feedback
- **Homey Community Forum**: https://community.homey.app/search?q=Tuya
- **Universal TUYA Zigbee App Discussion**: Posts #139-141 analyzed
- **User Reports**: Connection stability issues, formatting suggestions
- **Device Requests**: Radar sensors, soil moisture sensors, air quality monitors

## Data Integration

### Manufacturer Database
- **1500+ devices** from 80+ manufacturers
- **Comprehensive manufacturer IDs** from all sources
- **Product ID mapping** for device recognition
- **Category-based organization** (unbranded approach)

### Cluster Mappings
- **SDK3 compliant numeric format** (basic: 0, onOff: 6, etc.)
- **Complete cluster reference** with capabilities mapping
- **Endpoint definitions** for proper device communication
- **Binding configurations** for optimal performance

### Image Standards
- **Johan Benz color palette** by device category
- **Professional gradient backgrounds** with device silhouettes
- **SDK3 dimension compliance** for all generated images
- **Consistent visual hierarchy** across all devices

## Automation & Maintenance

### Monthly Updates
- **GitHub Actions workflow** for automated data collection
- **Forum monitoring** for new device requests
- **Database synchronization** with external sources
- **Automatic draft publication** with validation

### Quality Assurance
- **Zero validation errors** requirement
- **Comprehensive testing** before publication
- **Professional documentation** maintenance
- **Community feedback integration**

### Future Enhancements
- **OTA firmware updates** using Homey native capabilities
- **Enhanced device pairing stability** improvements
- **Expanded manufacturer coverage** based on community requests
- **Advanced diagnostics** for troubleshooting

---
*Last Updated: 2025-09-15T19:01:16.667Z*
*Sources Count: 4 primary + 15+ secondary*
*Device Coverage: 1500+ devices from 80+ manufacturers*