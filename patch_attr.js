const fs = require('fs');

let content = fs.readFileSync('lib/devices/ButtonDevice.js', 'utf8');

// Find where onOffCluster listeners are set up
const searchStr = "onOffCluster.on('attr.onOff', async (value) => {";
const replaceStr = "onOffCluster.on('attr.32772', async (value) => {\\n              this.log(\[BUTTON-MODE] 🔄 Manual mode change detected: \\);\\n              this.setSettings({ button_mode: value === 1 ? 'scene' : 'dimmer' }).catch(() => {});\\n            });\\n            \\n            " + searchStr;

if (content.includes(searchStr) && !content.includes("attr.32772")) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('lib/devices/ButtonDevice.js', content);
  console.log('Added attr.32772 listener to ButtonDevice.js');
} else {
  console.log('Listener already exists or hook not found');
}
