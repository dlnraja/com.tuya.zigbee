const fs = require('fs');
const {execSync} = require('child_process');

console.log('🚀 MINI RECREATE');

const drivers = ['air_quality_monitor', 'led_strip_advanced', 'smart_plug_energy'];
const megaIDs = ["_TZE200_", "_TZ3000_", "Tuya", "MOES"];

drivers.forEach(name => {
  fs.mkdirSync(`drivers/${name}/assets/images`, {recursive: true});
  
  const config = {
    name: {en: name.replace(/_/g, ' ')},
    class: "sensor",
    capabilities: ["onoff"],
    zigbee: {manufacturerName: megaIDs, productId: ["TS0601"]}
  };
  
  fs.writeFileSync(`drivers/${name}/driver.compose.json`, JSON.stringify(config, null, 2));
  console.log(`✅ ${name} created`);
});

execSync('git add -A && git commit -m "🚀 RECREATE: Essential drivers" && git push origin master');
console.log('✅ Done');
