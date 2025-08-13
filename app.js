'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Index dynamique des drivers
    this.driverIndex = this.buildDriverIndex();
    
    this.log(`Indexé ${Object.keys(this.driverIndex).length} drivers`);
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
      // Scanner les domaines (tuya, zigbee)
      const domains = fs.readdirSync(driversDir).filter(item => 
        fs.statSync(path.join(driversDir, item)).isDirectory()
      );
      
      for (const domain of domains) {
        const domainPath = path.join(driversDir, domain);
        const categories = fs.readdirSync(domainPath).filter(item => 
          fs.statSync(path.join(domainPath, item)).isDirectory()
        );
        
        for (const category of categories) {
          const categoryPath = path.join(domainPath, category);
          const vendors = fs.readdirSync(categoryPath).filter(item => 
            fs.statSync(path.join(categoryPath, item)).isDirectory()
          );
          
          for (const vendor of vendors) {
            const vendorPath = path.join(categoryPath, vendor);
            const models = fs.readdirSync(vendorPath).filter(item => 
              fs.statSync(path.join(vendorPath, item)).isDirectory()
            );
            
            for (const model of models) {
              const modelPath = path.join(vendorPath, model);
              const driverId = `${category}-${vendor}-${model}`;
              
              // Vérifier que le driver a les fichiers nécessaires
              const devicePath = path.join(modelPath, 'device.js');
              if (fs.existsSync(devicePath)) {
                try {
                  const driver = require(`./${path.relative(__dirname, modelPath)}/device`);
                  drivers[driverId] = driver;
                } catch (error) {
                  this.log(`Erreur chargement driver ${driverId}:`, error.message);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      this.log('Erreur lors de la construction de l\'index des drivers:', error.message);
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