'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
  async onInit() {
    this.log('Tuya Zigbee App v3.3.0 - Structure SDK3+ conforme');
    
    // Index dynamique des drivers selon la nouvelle structure
    this.driverIndex = this.buildDriverIndex();
    
    this.log(`Indexé ${Object.keys(this.driverIndex).length} drivers avec la structure SDK3+`);
  }
  
  buildDriverIndex() {
    const fs = require('fs');
    const path = require('path');
    const driversDir = path.join(__dirname, 'drivers');
    
    if (!fs.existsSync(driversDir)) {
      this.log('Dossier drivers/ non trouvé');
      return {};
    }
    
    const drivers = {};
    
    try {
      // Scanner la nouvelle structure 3.3 conforme
      const domains = fs.readdirSync(driversDir).filter(item =>
        fs.statSync(path.join(driversDir, item)).isDirectory()
      );
      
      for (const domain of domains) {
        const domainPath = path.join(driversDir, domain);
        const subdirs = fs.readdirSync(domainPath).filter(item =>
          fs.statSync(path.join(domainPath, item)).isDirectory()
        );
        
        for (const subdir of subdirs) {
          if (subdir === 'models' || subdir === '__generic__' || subdir === '__templates__') {
            const subdirPath = path.join(domainPath, subdir);
            const driverDirs = fs.readdirSync(subdirPath).filter(item =>
              fs.statSync(path.join(subdirPath, item)).isDirectory()
            );
            
            for (const driverDir of driverDirs) {
              const driverPath = path.join(subdirPath, driverDir);
              const devicePath = path.join(driverPath, 'device.js');
              
              if (fs.existsSync(devicePath)) {
                try {
                  const driver = require(`./${path.relative(__dirname, driverPath)}/device`);
                  drivers[driverDir] = driver;
                } catch (error) {
                  this.log(`Erreur chargement driver ${driverDir}:`, error.message);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      this.log('Erreur lors de la construction de l'index des drivers:', error.message);
    }
    
    return drivers;
  }
  
  getDriverIndex() {
    return this.driverIndex;
  }
  
  reloadDriverIndex() {
    this.driverIndex = this.buildDriverIndex();
    return this.driverIndex;
  }
}

module.exports = TuyaZigbeeApp;