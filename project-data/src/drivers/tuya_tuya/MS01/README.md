# Tuya Multi-Sensor (MS01) Driver

A Homey Pro compatible driver for Tuya Zigbee multi-sensor devices, providing comprehensive sensor monitoring and configuration through an intuitive interface.

## Features

- **Real-time Monitoring**: View temperature, humidity, motion, and battery status at a glance
- **Configurable Settings**: Customize device behavior to match your needs
- **Responsive Design**: Works on desktop and mobile devices
- **Multi-language Support**: English and French localization included
- **Homey Pro Integration**: Native look and feel with Homey's design system

## Supported Devices

- Tuya Zigbee Multi-Sensor (Model: MS01)
- Other compatible Tuya Zigbee multi-sensor devices

## Installation

1. Copy the `MS01` folder to your Homey app's `drivers` directory
2. Add the driver to your `app.json` configuration:

```json
{
  "id": "tuya-multi-sensor",
  "name": {
    "en": "Tuya Multi-Sensor",
    "fr": "Capteur Multi Tuya"
  },
  "class": "sensor",
  "capabilities": [
    "measure_temperature",
    "measure_humidity",
    "alarm_motion",
    "measure_battery"
  ],
  "capabilitiesOptions": {
    "measure_temperature": {
      "title": {
        "en": "Temperature",
        "fr": "Température"
      }
    },
    "measure_humidity": {
      "title": {
        "en": "Humidity",
        "fr": "Humidité"
      }
    },
    "alarm_motion": {
      "title": {
        "en": "Motion",
        "fr": "Mouvement"
      }
    },
    "measure_battery": {
      "title": {
        "en": "Battery",
        "fr": "Batterie"
      }
    }
  },
  "energy": {
    "batteries": ["INTERNAL"]
  },
  "images": {
    "small": "/drivers/tuya/MS01/assets/small.png",
    "large": "/drivers/tuya/MS01/assets/large.png",
    "xlarge": "/drivers/tuya/MS01/assets/xlarge.png"
  },
  "pair": [
    {
      "id": "list_devices",
      "template": "list_devices"
    }
  ]
}
```

## Usage

### Status Tab
View real-time sensor data and device status:
- Temperature and humidity readings
- Battery level
- Motion detection status
- Signal strength
- Last update time

### Settings Tab
Configure device settings:
- **Device Name**: Customize the device name
- **Report Interval**: Set how often the device reports its status (1 min to 12 hours)
- **Status LED**: Enable/disable the status LED
- **Battery Threshold**: Set the low battery alert level

### Advanced Tab
Access advanced device information and maintenance:
- View firmware and hardware versions
- Check MAC address
- Reboot the device
- Perform factory reset

## Localization

The interface supports multiple languages. Currently available:
- English (en)
- French (fr)

To add a new language:
1. Create a new JSON file in the `locales` folder with the language code (e.g., `de.json` for German)
2. Translate all the strings from `en.json` to the target language
3. The interface will automatically detect and use the user's language setting

## Development

### Dependencies
- Homey SDK v3 or later
- Vue.js 2.x (included in Homey's frontend)

### Building

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the app:
   ```bash
   npm run build
   ```

3. Deploy to Homey:
   - Use the Homey Developer Tools to upload the app
   - Or use the Homey CLI:
     ```bash
     homey app install
     ```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgements

- [Homey Community](https://community.athom.com/) for their support and feedback
- [Tuya](https://www.tuya.com/) for their Zigbee devices
- All contributors who helped improve this driver
