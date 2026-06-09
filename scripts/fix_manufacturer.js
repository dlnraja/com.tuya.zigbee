const fs = require('fs');
const files = [
  'drivers/scene_switch_2/driver.compose.json',
  'drivers/smart_remote_1_button_2/driver.compose.json',
  'drivers/wall_remote_4_gang_2/driver.compose.json',
  'drivers/wall_remote_4_gang_3/driver.compose.json',
  'drivers/wall_remote_6_gang/driver.compose.json'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/"manufacturerName"\s*:\s*\[\s*\]/g, '"manufacturerName": ["_TZE200_fallback"]');
  fs.writeFileSync(f, content);
});
