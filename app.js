'use strict';
const Homey = require('homey');

class App extends Homey.App {
  onInit() {
    this.log('com.tuya.zigbee → App init (IA refait tout le projet)');
    
    // Indexation dynamique robuste et non-bloquante
    try {
      const fs = require('fs'), path = require('path');
      const root = path.join(__dirname, 'drivers');
      
      if (fs.existsSync(root)) {
        const index = []; 
        const stack = [root];
        let processed = 0;
        
        while (stack.length && processed < 1000) { // Limite de sécurité
          const current = stack.pop();
          let stat;
          
          try {
            stat = fs.statSync(current);
          } catch {
            continue; // Ignore les erreurs d'accès
          }
          
          if (stat.isDirectory()) {
            try {
              const entries = fs.readdirSync(current);
              const compose = ['driver.compose.json','driver.json']
                .map(n => path.join(current, n))
                .find(p => {
                  try { return fs.existsSync(p); } catch { return false; }
                });
              
              if (compose) {
                index.push({ 
                  dir: current, 
                  compose: compose.replace(__dirname + path.sep, ''),
                  relative: path.relative(root, current)
                });
              }
              
              // Ajouter les sous-répertoires à la pile
              for (const entry of entries) {
                const entryPath = path.join(current, entry);
                try {
                  const entryStat = fs.statSync(entryPath);
                  if (entryStat.isDirectory()) {
                    stack.push(entryPath);
                  }
                } catch {
                  // Ignore les erreurs d'accès aux sous-répertoires
                }
              }
            } catch {
              // Ignore les erreurs de lecture de répertoire
            }
          }
          processed++;
        }
        
        this.__driverIndex = index;
        this.log(`[drivers-index] ${index.length} drivers indexés (${processed} répertoires traités)`);
        
        // Statistiques par domaine
        const stats = index.reduce((acc, item) => {
          const parts = item.relative.split(path.sep);
          const domain = parts[0] || 'unknown';
          acc[domain] = (acc[domain] || 0) + 1;
          return acc;
        }, {});
        
        for (const [domain, count] of Object.entries(stats)) {
          this.log(`[drivers-index] ${domain}: ${count} drivers`);
        }
      } else {
        this.log('[drivers-index] drivers/ directory not found');
        this.__driverIndex = [];
      }
    } catch(error) {
      this.error('[drivers-index] indexation failed:', error?.message || error);
      this.__driverIndex = [];
    }
    
    this.log('App ready - IA automation active');
  }
  
  // Méthode utilitaire pour accéder à l'index
  getDriverIndex() {
    return this.__driverIndex || [];
  }
  
  // Méthode pour recharger l'index
  async reloadDriverIndex() {
    this.log('[drivers-index] reloading...');
    this.onInit(); // Re-exécute l'indexation
  }
}

module.exports = App;