# Tuya Smart Plug Driver

A Homey driver for Tuya Smart Plugs, supporting power monitoring and remote control.

## Features

- Power on/off control
- Real-time power consumption monitoring
- Voltage and current measurement
- Multi-language support (English, French, Dutch, Tamil)
- Auto-discovery of Tuya devices

## Supported Devices

- Tuya Smart Plug (WiFi & Zigbee)
- Compatible with most Tuya-based smart plugs

## Installation

1. Install the driver through the Homey app store
2. Add your Tuya account in the app settings
3. The app will automatically discover your Tuya devices

## Configuration

### Required Settings

- **Tuya API Key**: Your Tuya IoT Platform API key
- **Tuya API Secret**: Your Tuya IoT Platform API secret
- **Tuya Region**: The region of your Tuya account

### Optional Settings

- **Polling Interval**: How often to check device status (default: 30 seconds)
- **Debug Mode**: Enable for detailed logging

## Usage

### Basic Controls

- Use the power button in the Homey app to turn the plug on/off
- View real-time power consumption in the device details
- Create flows based on power state changes

### Flow Cards

#### Triggers
- **Power State Changed**: When the plug is turned on or off
- **Power Consumption Changed**: When power consumption changes by a certain threshold

#### Actions
- **Turn On**: Turn the plug on
- **Turn Off**: Turn the plug off
- **Toggle**: Toggle the plug's power state

## Troubleshooting

### Device Not Found
- Ensure the plug is powered on and connected to your network
- Check that your Tuya account has the correct permissions
- Verify the API key and secret in the app settings

### Connection Issues
- Check your network connection
- Ensure the Homey app has the latest updates
- Restart the Homey app and your Homey device

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
