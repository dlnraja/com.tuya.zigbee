# Switches Documentation

## Overview

This document provides comprehensive information about all switch devices supported by the Tuya Zigbee Universal Integration.

## Switch Categories

### 1-Gang Switches
- **Basic Functionality**: Simple on/off control
- **Supported Models**: TS0001, TS0002, TS0003
- **Clusters**: Basic (0x0000), OnOff (0x0006)
- **Features**: 
  - Manual control
  - Remote control via Homey
  - Status reporting
  - Power monitoring (if supported)

### 2-Gang Switches
- **Basic Functionality**: Dual on/off control
- **Supported Models**: TS0004, TS0005, TS0006
- **Clusters**: Basic (0x0000), OnOff (0x0006) [per gang]
- **Features**:
  - Independent control of two circuits
  - Individual status reporting
  - Power monitoring per gang

### 3-Gang Switches
- **Basic Functionality**: Triple on/off control
- **Supported Models**: TS0007, TS0008, TS0009
- **Clusters**: Basic (0x0000), OnOff (0x0006) [per gang]
- **Features**:
  - Independent control of three circuits
  - Individual status reporting
  - Power monitoring per gang

### 4-Gang Switches
- **Basic Functionality**: Quadruple on/off control
- **Supported Models**: TS0010, TS0011, TS0012
- **Clusters**: Basic (0x0000), OnOff (0x0006) [per gang]
- **Features**:
  - Independent control of four circuits
  - Individual status reporting
  - Power monitoring per gang

## Smart Plugs

### Basic Smart Plugs
- **Basic Functionality**: Power outlet control
- **Supported Models**: TS0001, TS0002
- **Clusters**: Basic (0x0000), OnOff (0x0006), Power Configuration (0x0001)
- **Features**:
  - Remote power control
  - Power consumption monitoring
  - Overload protection
  - Energy usage statistics

### Power Strips
- **Basic Functionality**: Multiple outlet control
- **Supported Models**: TS0004, TS0005, TS0006
- **Clusters**: Basic (0x0000), OnOff (0x0006) [per outlet], Power Configuration (0x0001)
- **Features**:
  - Multiple outlet control
  - Individual outlet monitoring
  - Power consumption per outlet
  - Surge protection

## Regional Variations

### Brazilian Market (gpmachado contributions)
- **Zemismart Switches**: Enhanced with BoundCluster and PowerOnState
- **NovaDigital Devices**: White brand device support
- **Special Features**:
  - Retry mechanisms for reliability
  - PowerOnState configuration
  - BoundCluster implementation
  - Regional frequency optimization

### European Market
- **EU Standards**: CE compliance
- **Frequency**: 868 MHz band
- **Safety**: Enhanced safety features
- **Certification**: EU safety standards

### North American Market
- **US Standards**: FCC compliance
- **Frequency**: 915 MHz band
- **Safety**: UL/ETL certification
- **Features**: Enhanced power monitoring

## Installation and Setup

### Pairing Process
1. **Reset Device**: Hold button for 5 seconds
2. **Add Device**: Use Homey app to add device
3. **Select Driver**: Choose appropriate switch driver
4. **Configure Settings**: Set up device-specific options
5. **Test Functionality**: Verify all features work

### Configuration Options
```json
{
  "powerOnState": "on|off|last",
  "retryAttempts": 3,
  "timeout": 30000,
  "reportingInterval": 300,
  "powerMonitoring": true
}
```

## Troubleshooting

### Common Issues
- **Device not responding**: Check Zigbee network connectivity
- **Incorrect gang control**: Verify driver selection
- **Power monitoring not working**: Check device capabilities
- **Pairing fails**: Reset device and try again

### Debugging Steps
1. Check device logs in Homey
2. Verify Zigbee network status
3. Test device with Tuya app
4. Check driver configuration
5. Review network interference

## Best Practices

### Installation
- **Location**: Install in easily accessible locations
- **Network**: Ensure good Zigbee signal strength
- **Power**: Use stable power supply
- **Environment**: Avoid extreme temperatures

### Configuration
- **PowerOnState**: Set based on user preference
- **Retry Mechanisms**: Enable for reliability
- **Monitoring**: Enable power monitoring if available
- **Reporting**: Configure appropriate reporting intervals

### Maintenance
- **Regular Testing**: Test functionality monthly
- **Firmware Updates**: Keep devices updated
- **Network Monitoring**: Monitor Zigbee network health
- **Backup Configuration**: Save device configurations

## Device Matrix

| Device Type | Model ID | Gangs | Power Monitoring | Regional Support |
|-------------|----------|-------|------------------|------------------|
| 1-Gang Switch | TS0001 | 1 | ❌ | Global |
| 2-Gang Switch | TS0004 | 2 | ❌ | Global |
| 3-Gang Switch | TS0007 | 3 | ❌ | Global |
| 4-Gang Switch | TS0010 | 4 | ❌ | Global |
| Smart Plug | TS0001 | 1 | ✅ | Global |
| Power Strip | TS0004 | 4 | ✅ | Global |
| Zemismart Switch | ZS0001 | 1 | ❌ | Brazil |
| NovaDigital Switch | ND0001 | 1 | ❌ | Brazil |

## References

- [Zigbee Switch Standards](https://zigbeealliance.org/specifications/)
- [Tuya Switch Documentation](https://developer.tuya.com/)
- [Homey Switch Integration](https://apps.athom.com/docs/)
- [gpmachado Contributions](https://github.com/gpmachado/HomeyPro-Tuya-Devices) 