const fs = require('fs');
fs.copyFileSync('drivers/motion_sensor_battery/assets/images/small.png', 'assets/images/small.png');
fs.copyFileSync('drivers/motion_sensor_battery/assets/images/large.png', 'assets/images/large.png');
console.log('✅ Images copiées (75x75 et 500x500)');
