'use strict';
const Homey = require('homey');

class App extends Homey.App {
  onInit() {
    this.log('com.tuya.zigbee → App init');
    const mode = process.env.TUYA_MODE || 'full';
    this.log(`[mode] ${mode}`);

    try {
      const fs = require('fs');
      const path = require('path');
      const root = path.join(__dirname, 'drivers');
      
      if (fs.existsSync(root)) {
        const index = [];
        const st = [root];
        
        while (st.length) {
          const cur = st.pop();
          let s;
          try { s = fs.statSync(cur); } catch { continue; }
          
          if (s.isDirectory()) {
            const es = fs.readdirSync(cur);
            const compose = ['driver.compose.json', 'driver.json']
              .map(n => path.join(cur, n))
              .find(p => fs.existsSync(p));
            
            if (compose) {
              index.push({ 
                dir: cur, 
                compose: compose.replace(__dirname + path.sep, '') 
              });
            }
            
            for (const e of es) {
              st.push(path.join(cur, e));
            }
          }
        }
        
        this.__driverIndex = index;
        this.log(`[drivers-index] ${index.length}`);
      }
    } catch(e) {
      this.error('[drivers-index] skipped', e?.message || e);
    }

    this.log('App ready');
  }
}

module.exports = App;