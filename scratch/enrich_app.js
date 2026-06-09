const fs = require('fs');

const appJsonPath = 'c:\\Users\\HP\\Desktop\\homey-app\\tuya_repair\\app.json';
const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const driver = appData.drivers.find(d => d.id === 'tuya_generic_dpid');

if (driver) {
  // Replace capabilities
  driver.capabilities = [
    'onoff.1', 'onoff.2', 'onoff.3',
    'dim.1', 'dim.2',
    'measure_temperature', 'measure_humidity',
    'measure_power', 'measure_battery'
  ];

  // Set settings
  driver.settings = [
    {
      type: "group",
      label: {
        en: "Switches DP Mapping",
        fr: "Mapping des DP Interrupteurs"
      },
      children: [
        { id: "dp_onoff_1", type: "number", label: { en: "DP ID for Switch 1", fr: "DP ID pour l'Interrupteur 1" }, value: 0 },
        { id: "dp_onoff_2", type: "number", label: { en: "DP ID for Switch 2", fr: "DP ID pour l'Interrupteur 2" }, value: 0 },
        { id: "dp_onoff_3", type: "number", label: { en: "DP ID for Switch 3", fr: "DP ID pour l'Interrupteur 3" }, value: 0 }
      ]
    },
    {
      type: "group",
      label: {
        en: "Dimmers DP Mapping",
        fr: "Mapping des DP Variateurs"
      },
      children: [
        { id: "dp_dim_1", type: "number", label: { en: "DP ID for Dimmer 1", fr: "DP ID pour le Variateur 1" }, value: 0 },
        { id: "dp_dim_2", type: "number", label: { en: "DP ID for Dimmer 2", fr: "DP ID pour le Variateur 2" }, value: 0 }
      ]
    },
    {
      type: "group",
      label: {
        en: "Sensors DP Mapping",
        fr: "Mapping des DP Capteurs"
      },
      children: [
        { id: "dp_temperature", type: "number", label: { en: "DP ID for Temperature", fr: "DP ID pour la Température" }, value: 0 },
        { id: "dp_humidity", type: "number", label: { en: "DP ID for Humidity", fr: "DP ID pour l'Humidité" }, value: 0 },
        { id: "dp_power", type: "number", label: { en: "DP ID for Power (W)", fr: "DP ID pour la Puissance (W)" }, value: 0 },
        { id: "dp_battery", type: "number", label: { en: "DP ID for Battery (%)", fr: "DP ID pour la Batterie (%)" }, value: 0 }
      ]
    }
  ];

  fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2), 'utf8');
  console.log('Successfully updated app.json with generic driver capabilities and settings.');
} else {
  console.log('Generic driver not found!');
}
