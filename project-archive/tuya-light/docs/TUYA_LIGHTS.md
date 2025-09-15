# 💡 Tuya Light Support

## Supported Light Models

| Model | Type | Capabilities | Status |
|-------|------|--------------|--------|
| TS0505B | RGB+CCT Bulb | Full color + white temperature | ✅ Complete |
| TS0502A | CCT Bulb | White temperature control | ✅ Complete |
| TS0501A | Dimmable | On/Off + Dimming | ✅ Complete |
| TS0502B | CCT Bulb v2 | White temperature control | ✅ Complete |
| TS0505A | RGB+CCT Alt | Full color + white temperature | ✅ Complete |

## Features

### 🎨 Color Control
- **RGB Colors**: Full spectrum color control with hue and saturation
- **Color Temperature**: Warm to cool white (2700K - 6500K)
- **Brightness**: Smooth dimming from 1% to 100%

### ⚡ Smart Features
- **Auto-Detection**: Automatically detects device capabilities
- **Energy Monitoring**: Approximated power consumption tracking
- **Scene Control**: Predefined color scenes via flows
- **Smooth Transitions**: Optimized for seamless color changes

### 🔧 Technical Details
- **Zigbee Clusters**: 0x0006 (On/Off), 0x0008 (Level), 0x0300 (Color)
- **Reporting**: Optimized intervals for responsive control
- **Compatibility**: Works with all major Tuya light manufacturers

## Installation

### Via Homey App Store
1. Search for "Universal Tuya Zigbee" in the Homey App Store
2. Install the app
3. Add your Tuya lights using the "Add Device" flow

### Manual Pairing
1. Put your Tuya light in pairing mode (usually toggle 5 times)
2. Go to "Add Device" in Homey
3. Select "Universal Tuya Zigbee"
4. Choose your light model or use "Universal Light"
5. Follow the pairing instructions

## Troubleshooting

### Light Not Responding
- Ensure the light is properly paired
- Check Zigbee network coverage
- Try re-pairing the device

### Colors Not Working
- Verify your light supports RGB (TS0505B/TS0505A models)
- Check that color capabilities are enabled
- Update to latest app version

### Dimming Issues
- Confirm your light supports dimming
- Check minimum brightness settings
- Ensure proper Zigbee cluster configuration

## Advanced Configuration

### Custom Color Scenes
You can create custom color scenes using Homey flows:

1. **Trigger**: When motion detected
2. **Condition**: Time is between sunset and sunrise  
3. **Action**: Set light to warm white at 30%

### Energy Optimization
- RGB lights: ~9W approximation
- CCT lights: ~7W approximation  
- Dimmable: ~6W approximation

## Community Patches Applied

- ✅ **Smooth Dimming**: Optimized level control for seamless transitions
- ✅ **Color Accuracy**: Improved color rendering and temperature control
- ✅ **Battery Optimization**: Reduced power consumption during standby
- ✅ **Scene Performance**: Faster scene switching and color changes

## Developer Notes

### Driver Structure
- Individual drivers per model for specific optimizations
- Universal driver for auto-detection and compatibility
- Johan Benz style UI components and images
- Community feedback integration

### Zigbee Implementation
- Pure Zigbee implementation (no cloud dependency)
- Optimized cluster configurations
- Enhanced error handling and recovery
- Real-time capability detection

---

**Last Updated**: 2025-09-10T09:15:34.496Z
**Version**: 3.1.0
**Community Enhanced**: Yes ✅