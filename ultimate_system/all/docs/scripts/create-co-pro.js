const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔥 CREATE CO DETECTOR PRO');

const name = 'co_detector_pro';
fs.mkdirSync(`drivers/${name}/assets/images`, {recursive: true});

const config = {
  name: {en: "CO Detector Pro", fr: "Détecteur CO Pro"},
  class: "sensor", 
  capabilities: ["alarm_co", "measure_co", "measure_battery"],
  energy: {batteries: ["CR2032", "PP3"]},
  zigbee: {
    manufacturerName: ["_TZE200_", "_TZ3000_", "Tuya", "MOES"],
    productId: ["TS0601"]
  }
};

fs.writeFileSync(`drivers/${name}/driver.compose.json`, JSON.stringify(config, null, 2));

execSync('git add -A && git commit -m "🔥 CREATE: CO Detector Pro (Safety category)" && git push origin master');
console.log('✅ CO Detector Pro created');
