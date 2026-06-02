const fs = require('fs');
const path = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\remote_button_wireless_wall\\driver.flow.compose.json';

try {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (data.triggers) {
    data.triggers.forEach(trigger => {
      // Replace button_wireless_1_ with remote_button_wireless_wall_
      let id = trigger.id.replace('button_wireless_1_', 'remote_button_wireless_wall_');
      // Strip any _dup_XXXXX suffix
      id = id.replace(/_dup_[a-z0-9]+$/, '');
      trigger.id = id;
    });
  }
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Successfully updated remote_button_wireless_wall flow compose file!');
} catch (err) {
  console.error('Error:', err.message);
}
