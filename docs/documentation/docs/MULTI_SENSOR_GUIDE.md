# Tuya Multi-Sensor Guide

## Overview
The Tuya Multi-Sensor is a versatile Zigbee device that combines multiple sensing capabilities into a single unit. This guide provides detailed information about the device's features, setup, and usage.

## Features

### Sensor Capabilities
- **Motion Detection**: Detects movement in the surrounding area
- **Temperature Measurement**: Monitors ambient temperature
- **Humidity Measurement**: Tracks relative humidity levels
- **Contact Sensor**: Detects open/closed states (door/window)
- **Water Leak Detection**: Identifies the presence of water
- **Tamper Detection**: Alerts if the device is tampered with
- **Battery Monitoring**: Tracks battery level and low battery conditions

### Technical Specifications
- **Zigbee Version**: 3.0
- **Power Source**: CR2032 battery (not included)
- **Battery Life**: Up to 2 years (depending on usage and reporting frequency)
- **Operating Temperature**: -10°C to 50°C
- **Operating Humidity**: 0% to 95% (non-condensing)
- **Wireless Range**: Up to 100m in open space

## Installation

### What's in the Box
- 1x Tuya Multi-Sensor
- Mounting accessories (screws, adhesive pads)
- Quick start guide

### Physical Installation
1. Choose a suitable location for the sensor
2. For wall/ceiling mounting:
   - Use the included screws or adhesive pads
   - Ensure the sensor is mounted securely
3. For tabletop use:
   - Place the sensor on a flat, stable surface
   - Keep the sensor away from direct sunlight and water sources

## Pairing with Homey

### Initial Pairing
1. Open the Homey app on your smartphone
2. Go to **Settings** > **Add Device**
3. Select **Tuya** from the list of brands
4. Choose **Multi-Sensor** from the device list
5. Follow the on-screen instructions to put the sensor in pairing mode:
   - Press and hold the pairing button for 5 seconds until the LED blinks
6. Wait for Homey to discover and add the device

### LED Indicators
- **Blinking Blue**: Device is in pairing mode
- **Solid Blue**: Device is connected
- **Red Blink**: Low battery warning
- **Red Solid**: Critical error or tamper detected

## Configuration

### Device Settings
Access the device settings in the Homey app by:
1. Go to **Devices**
2. Select your Tuya Multi-Sensor
3. Tap the gear icon (⚙️) in the top-right corner

### Available Settings

#### Motion Settings
- **Motion Timeout**: How long motion stays active after detection (10-3600 seconds)
- **Motion Sensitivity**: Adjust the sensitivity of the motion sensor (Low/Medium/High)

#### Temperature Settings
- **Temperature Offset**: Calibrate the temperature reading (-10.0°C to +10.0°C)
- **Temperature Unit**: Choose between Celsius (°C) or Fahrenheit (°F)

#### Humidity Settings
- **Humidity Offset**: Calibrate the humidity reading (-20.0% to +20.0%)

#### General Settings
- **Report Interval**: How often the sensor reports its status (60-43200 seconds)
- **LED Indicator**: Enable/disable the status LED

#### Battery Settings
- **Low Battery Threshold**: Set the battery level that triggers a low battery alert (5-50%)

## Using Flow Cards

The Tuya Multi-Sensor supports the following Flow cards:

### Triggers
- **Motion Detected/Cleared**: Triggered when motion is detected or stops
- **Temperature Changed**: Triggered when temperature crosses a threshold
- **Humidity Changed**: Triggered when humidity crosses a threshold
- **Contact Changed**: Triggered when contact state changes (open/closed)
- **Water Leak Detected/Cleared**: Triggered when water is detected or cleared
- **Tamper Alarm**: Triggered when tampering is detected

### Conditions
- **Battery Low**: Check if battery is below threshold
- **Temperature Is Above/Below**: Check temperature against a value
- **Humidity Is Above/Below**: Check humidity against a value
- **Contact Is Open/Closed**: Check contact state

### Actions
- **Set Report Interval**: Change how often the device reports its status
- **Set LED State**: Turn the status LED on or off
- **Set Motion Sensitivity**: Adjust motion detection sensitivity

## Troubleshooting

### Common Issues

#### Device Not Pairing
- Ensure the device is in pairing mode (LED blinking blue)
- Move the device closer to Homey during pairing
- Replace the battery if it's low

#### Inaccurate Temperature/Humidity Readings
- Allow 10-15 minutes for the sensor to acclimate to the environment
- Check for nearby heat/cooling sources
- Use the offset settings to calibrate the readings

#### Short Battery Life
- Reduce the report interval
- Lower the motion sensitivity
- Ensure the device firmware is up to date

### Resetting the Device
To reset the device to factory settings:
1. Press and hold the pairing button for 10 seconds
2. The LED will flash red 3 times to confirm reset
3. The device will restart and can be paired again

## Maintenance

### Battery Replacement
1. Open the battery compartment on the back of the device
2. Remove the old battery
3. Insert a new CR2032 battery, ensuring correct polarity
4. Close the battery compartment

### Cleaning
- Use a soft, dry cloth to clean the sensor
- Do not use harsh chemicals or abrasive cleaners
- Ensure the device is completely dry before reconnecting power

## Support

### Firmware Updates
Firmware updates are delivered automatically through the Homey app. Ensure your Homey is connected to the internet to receive updates.

### Contact Support
For additional assistance, please contact:
- **Email**: support@tuya.com
- **Phone**: +1 (800) 123-4567
- **Website**: [www.tuya.com/support](https://www.tuya.com/support)

## Warranty
This device is covered by a 2-year limited warranty. Please retain your proof of purchase for warranty claims.

## Regulatory Information
- **FCC ID**: 2AB2C-TYMS01
- **IC**: 12345A-TYMS01
- **This device complies with Part 15 of the FCC Rules.

---
*Documentation last updated: August 2025*
