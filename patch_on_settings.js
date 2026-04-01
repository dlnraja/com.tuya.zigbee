const fs = require('fs');

let content = fs.readFileSync('lib/devices/ButtonDevice.js', 'utf8');

if (!content.includes('async onSettings(')) {
  const insertIndex = content.lastIndexOf('}');
  const newMethod = \
  /**
   * v6.0: Manual Mode Override Setting
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('button_mode')) {
      this.log('[BUTTON-MODE] 🔄 Mode setting changed to: ' + newSettings.button_mode);
      
      const onOffCluster = this.zclNode?.endpoints?.[1]?.clusters?.onOff
        || this.zclNode?.endpoints?.[1]?.clusters?.genOnOff
        || this.zclNode?.endpoints?.[1]?.clusters?.[6];
        
      if (!onOffCluster) {
        throw new Error('OnOff cluster not found on EP1 - device might not support mode switching');
      }

      if (newSettings.button_mode === 'scene') {
        try {
          if (typeof onOffCluster.writeAttributes === 'function') {
            await onOffCluster.writeAttributes({ [0x8004]: 1 });
          } else {
            await onOffCluster.write(0x8004, 1);
          }
          this.log('[BUTTON-MODE] ✅ Successfully switched to Scene mode!');
        } catch (err) {
          this.error('[BUTTON-MODE] ❌ Failed to switch to Scene mode:', err.message);
          throw new Error('Failed to switch mode: ' + err.message);
        }
      } else if (newSettings.button_mode === 'dimmer') {
        try {
          if (typeof onOffCluster.writeAttributes === 'function') {
            await onOffCluster.writeAttributes({ [0x8004]: 0 });
          } else {
            await onOffCluster.write(0x8004, 0);
          }
          this.log('[BUTTON-MODE] ✅ Successfully switched to Dimmer mode!');
        } catch (err) {
          this.error('[BUTTON-MODE] ❌ Failed to switch to Dimmer mode:', err.message);
          throw new Error('Failed to switch mode: ' + err.message);
        }
      } else if (newSettings.button_mode === 'auto') {
         await this._universalSceneModeSwitch(this.zclNode);
      }
    }
    
    // Call parent if exists
    if (typeof super.onSettings === 'function') {
      return super.onSettings({ oldSettings, newSettings, changedKeys });
    }
  }
\;
  
  content = content.substring(0, insertIndex) + newMethod + '\\n}';
  fs.writeFileSync('lib/devices/ButtonDevice.js', content);
  console.log('Added onSettings method to ButtonDevice.js');
} else {
  console.log('onSettings already exists');
}
