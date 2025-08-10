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
        const summary = { zigbee: { total: 0, vendors: {} }, tuya: { total: 0, vendors: {} }, other: { total: 0, vendors: {} } };
        const st = [root];
        
        while (st.length) {
          const cur = st.pop();
          let s;
          
          try {
            s = fs.statSync(cur);
          } catch {
            continue;
          }
          
          if (s.isDirectory()) {
            const es = fs.readdirSync(cur);
            const compose = ['driver.compose.json', 'driver.json']
              .map(n => path.join(cur, n))
              .find(p => fs.existsSync(p));
              
            if (compose) {
              const rel = compose.replace(__dirname + path.sep, '');
              index.push({ dir: cur, compose: rel });

              // Extraire protocole/vendor/catégorie depuis le chemin
              const parts = rel.split(/[\\/]/);
              const pIdx = parts.indexOf('drivers') + 1;
              const proto = (parts[pIdx] || 'other').toLowerCase();
              const vendor = (parts[pIdx + 1] || 'generic').toLowerCase();
              const category = (parts[pIdx + 2] || 'other').toLowerCase();
              const bucket = summary[proto] ? summary[proto] : summary.other;
              bucket.total += 1;
              if (!bucket.vendors[vendor]) bucket.vendors[vendor] = { total: 0, categories: {} };
              bucket.vendors[vendor].total += 1;
              bucket.vendors[vendor].categories[category] = (bucket.vendors[vendor].categories[category] || 0) + 1;
            }
            
            for (const e of es) {
              st.push(path.join(cur, e));
            }
          }
        }
        
        this.__driverIndex = index;
        this.log(`[drivers-index] ${index.length} drivers indexés`);

        // Résumé par protocole/vendor/catégorie (petit aperçu)
        const showSummary = (proto) => {
          const bucket = summary[proto];
          if (!bucket) return;
          this.log(`[${proto}] total=${bucket.total}`);
          let shown = 0;
          for (const [v, info] of Object.entries(bucket.vendors)) {
            this.log(`  - ${v}: ${info.total}`);
            let cShown = 0;
            for (const [cat, cnt] of Object.entries(info.categories)) {
              if (cShown++ < 3) this.log(`      · ${cat}: ${cnt}`);
            }
            if (++shown >= 5) break; // limiter la sortie
          }
        };
        showSummary('zigbee');
        showSummary('tuya');
      }
    } catch(e) {
      this.error('[drivers-index] skipped', e?.message || e);
    }
    
    this.log('App ready');
  }
}

module.exports = App;