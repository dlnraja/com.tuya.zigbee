# Zigbee Clusters Reference

## Overview

This document provides comprehensive reference information for all Zigbee clusters supported by the Tuya Zigbee Universal Integration.

## Basic Clusters

### Basic Cluster (0x0000)
- **Description**: Provides basic device information
- **Attributes**: Model ID, Manufacturer ID, Hardware Version, etc.
- **Commands**: Reset to Factory Defaults

### OnOff Cluster (0x0006)
- **Description**: Controls on/off functionality
- **Attributes**: OnOff
- **Commands**: Toggle, Off, On, OffWithEffect

### Level Control Cluster (0x0008)
- **Description**: Controls dimming and level functionality
- **Attributes**: CurrentLevel, OnOffTransitionTime
- **Commands**: Move, MoveToLevel, Step

### Color Control Cluster (0x0300)
- **Description**: Controls color functionality
- **Attributes**: CurrentHue, CurrentSaturation, CurrentX, CurrentY
- **Commands**: MoveToHue, MoveToSaturation, MoveToColor

## Measurement Clusters

### Temperature Measurement Cluster (0x0402)
- **Description**: Measures temperature
- **Attributes**: MeasuredValue, MinMeasuredValue, MaxMeasuredValue

### Humidity Measurement Cluster (0x0405)
- **Description**: Measures humidity
- **Attributes**: MeasuredValue, MinMeasuredValue, MaxMeasuredValue

### Occupancy Sensing Cluster (0x0406)
- **Description**: Detects occupancy/motion
- **Attributes**: Occupancy, OccupancySensorType

## Security Clusters

### IAS Zone Cluster (0x0500)
- **Description**: Security and alarm functionality
- **Attributes**: ZoneState, ZoneType
- **Commands**: ZoneEnrollResponse, ZoneStatusChangeNotification

## Utility Clusters

### Power Configuration Cluster (0x0001)
- **Description**: Power management
- **Attributes**: MainsVoltage, MainsFrequency, BatteryVoltage

### Device Temperature Configuration Cluster (0x0002)
- **Description**: Device temperature monitoring
- **Attributes**: CurrentTemperature, MinTempExperienced, MaxTempExperienced

## Tuya-Specific Clusters

### Tuya Cluster (0xEF00)
- **Description**: Tuya-specific functionality
- **Attributes**: Custom attributes for Tuya devices
- **Commands**: Custom commands for Tuya devices

## Cluster Implementation

### Required Clusters for Different Device Types

#### Switches
- Basic Cluster (0x0000)
- OnOff Cluster (0x0006)

#### Dimmers
- Basic Cluster (0x0000)
- OnOff Cluster (0x0006)
- Level Control Cluster (0x0008)

#### RGB Lights
- Basic Cluster (0x0000)
- OnOff Cluster (0x0006)
- Level Control Cluster (0x0008)
- Color Control Cluster (0x0300)

#### Sensors
- Basic Cluster (0x0000)
- Temperature Measurement Cluster (0x0402) [if applicable]
- Humidity Measurement Cluster (0x0405) [if applicable]
- Occupancy Sensing Cluster (0x0406) [if applicable]

## Cluster Configuration

### Example Cluster Configuration
```json
{
  "zigbee": {
    "manufacturerName": "Tuya",
    "modelId": "TS0001",
    "endpoints": {
      "1": {
        "clusters": {
          "input": ["genBasic", "genOnOff"],
          "output": ["genBasic", "genOnOff"]
        }
      }
    }
  }
}
```

## Best Practices

1. **Always include Basic Cluster**: Required for all devices
2. **Use appropriate clusters**: Match clusters to device functionality
3. **Handle cluster interactions**: Some clusters work together
4. **Test cluster functionality**: Verify all cluster features work
5. **Document cluster usage**: Clear documentation for each cluster

## Troubleshooting

### Common Cluster Issues
- **Missing clusters**: Device doesn't respond to commands
- **Wrong cluster configuration**: Unexpected behavior
- **Cluster conflicts**: Multiple clusters interfering

### Debugging Steps
1. Check cluster configuration in driver
2. Verify cluster attributes are correct
3. Test cluster commands individually
4. Check Zigbee network connectivity
5. Review device logs for errors

## References

- [Zigbee Cluster Library Specification](https://zigbeealliance.org/specifications/)
- [Tuya Zigbee Documentation](https://developer.tuya.com/)
- [Homey SDK3 Documentation](https://apps.athom.com/docs/) 