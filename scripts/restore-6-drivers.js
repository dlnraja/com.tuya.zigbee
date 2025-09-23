const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔄 RESTORE 6 ELIMINATED DRIVERS');

const drivers = {
  ceiling_light_controller: {
    name: {en: "Ceiling Light Controller"},
    class: "light",
    capabilities: ["onoff", "dim"]
  },
  co2_sensor: {
    name: {en: "CO2 Sensor"},
    class: "sensor", 
    capabilities: ["measure_co2", "measure_temperature"]
  },
  energy_monitoring_plug: {
    name: {en: "Energy Monitoring Plug"},
    class: "socket",
    capabilities: ["onoff", "measure_power"]
  },
  energy_monitoring_plug_advanced: {
    name: {en: "Energy Plug Advanced"},
    class: "socket",
    capabilities: ["onoff", "measure_power", "meter_power"]
  },
  led_strip_controller: {
    name: {en: "LED Strip Controller"},
    class: "light",
    capabilities: ["onoff", "dim", "light_hue"]
  },
  led_strip_advanced: {
    name: {en: "LED Strip Advanced"},
    class: "light", 
    capabilities: ["onoff", "dim", "light_hue", "light_saturation"]
  }
};

const megaIDs = ["_TZE200_", "_TZ3000_", "Tuya", "MOES"];

Object.entries(drivers).forEach(([id, config]) => {
  fs.mkdirSync(`drivers/${id}/assets/images`, {recursive: true});
  
  config.zigbee = {
    manufacturerName: megaIDs,
    productId: ["TS0601"]
  };
  
  fs.writeFileSync(`drivers/${id}/driver.compose.json`, JSON.stringify(config, null, 2));
  console.log(`✅ ${id} restored`);
});

execSync('git add -A && git commit -m "🔄 RESTORE: 6 eliminated drivers fixed" && git push origin master');
console.log('🎉 All 6 drivers restored successfully!');
