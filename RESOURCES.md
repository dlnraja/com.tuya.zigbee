# 📚 Tuya Zigbee & Homey SDK - Complete Reference

## 🔗 Official Documentation

### Homey Development
- **Homey Apps SDK v3**: https://apps.developer.homey.app/sdk3/
- **Pairing Custom Views**: https://apps.developer.homey.app/the-basics/devices/pairing/custom-views
- **Creating a Driver Tutorial**: https://apps.developer.homey.app/tutorials/creating-a-driver/
- **Zigbee Tools**: https://tools.developer.homey.app/tools/zigbee

### Tuya Official
- **Main Documentation**: https://developer.tuya.com/en/docs/iot
- **Overview**: https://developer.tuya.com/en/overview
- **Zigbee SDK**: https://developer.tuya.com/en/docs/iot/zigbee-sdk?id=Kb9uab4y3hdw2
- **Downloads**: https://developer.tuya.com/en/docs/iot/download?id=Kbd668dicz9r6
- **Smart Product Solutions**: https://developer.tuya.com/en/docs/iot/smart-product-solutions?id=Ka5nx1vj8kisg
- **Zigbee Gateway Integration**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/Zigbee_2?id=Kcww7qppbe87m
- **Multi-Switch Standard**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard?id=K9ik6zvnqr09m

### Zigbee Standards
- **Zigbee Alliance - Cluster Library**: https://zigbeealliance.org/solution/zigbee-cluster-library-zcl/
- **Zigbee 3.0 Specification**: https://zigbeealliance.org/solution/zigbee-3-0/
- **Zigbee Deep Dive (French)**: https://connect.ed-diamond.com/MISC/misc-086/tout-tout-tout-vous-saurez-tout-sur-le-zigbee

### Community Resources
- **Zigpy Discussions**: https://github.com/zigpy/zigpy/discussions/823
- **Zigbee2MQTT Tuya DP Mapping**: https://github.com/Koenkk/zigbee2mqtt/discussions/4523

## 📖 Key Learnings from Documentation

### Tuya DP Protocol (Cluster 0xEF00)
- DPs are Tuya's proprietary data points
- Each DP represents a specific device function
- Common DPs: 1=temp, 2=humidity, 4/14/15=battery
- TS0601 devices use cluster 0xEF00 exclusively

### Standard Zigbee vs Tuya DP
- **Standard**: TS0002, TS0043, TS0044, TS0202, TS0222 (_TZ3000_*)
- **Tuya DP**: TS0601 (_TZE200_*, _TZE284_*)
- Never mix detection methods!

### Homey SDK3 Migration
- Use `homey.settings` not `Homey.ManagerSettings`
- Use `device.homey` for instance access
- Avoid null pointer exceptions with guards

## 🎯 Implementation Status

All documentation has been reviewed and implemented in v4.9.322.
