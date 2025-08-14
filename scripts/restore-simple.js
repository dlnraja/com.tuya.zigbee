#!/usr/bin/env node

console.log('🔄 RESTAURATION SIMPLE DES DRIVERS v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function restoreDrivers() {
  try {
    const projectRoot = process.cwd();
    const driversPath = path.join(projectRoot, 'drivers');
    const catalogPath = path.join(projectRoot, 'catalog');
    
    console.log('📁 Restauration de la structure...');
    
    // Créer les dossiers principaux
    const mainDirs = ['tuya_zigbee', 'zigbee', '_common'];
    for (const dir of mainDirs) {
      const dirPath = path.join(driversPath, dir);
      if (!await fs.pathExists(dirPath)) {
        await fs.ensureDir(dirPath);
        console.log(`✅ Créé: ${dir}`);
      }
    }
    
    // Créer la structure catalog
    if (!await fs.pathExists(catalogPath)) {
      await fs.ensureDir(catalogPath);
      console.log('✅ Créé: catalog/');
    }
    
    // Créer les catégories
    const categories = ['light', 'switch', 'sensor-motion', 'sensor-temp', 'sensor-humidity', 'cover', 'lock', 'other'];
    for (const category of categories) {
      const categoryPath = path.join(catalogPath, category);
      await fs.ensureDir(categoryPath);
      
      const tuyaPath = path.join(categoryPath, 'tuya');
      await fs.ensureDir(tuyaPath);
      
      const zigbeePath = path.join(categoryPath, 'zigbee');
      await fs.ensureDir(zigbeePath);
      
      console.log(`✅ Créé: catalog/${category}/`);
    }
    
    // Analyser les drivers existants
    console.log('🔍 Analyse des drivers existants...');
    
    const modelsPath = path.join(driversPath, 'tuya_zigbee', 'models');
    if (await fs.pathExists(modelsPath)) {
      const models = await fs.readdir(modelsPath);
      console.log(`📊 Trouvé ${models.length} modèles dans models/`);
      
      // Créer des exemples de drivers dans catalog
      for (let i = 0; i < Math.min(5, models.length); i++) {
        const model = models[i];
        const category = determineCategory(model);
        const catalogDir = path.join(catalogPath, category, 'tuya', model);
        
        if (!await fs.pathExists(catalogDir)) {
          await fs.ensureDir(catalogDir);
          
          // Créer un fichier metadata.json
          const metadata = {
            name: model,
            category: category,
            type: 'tuya_zigbee',
            created: new Date().toISOString()
          };
          
          await fs.writeFile(path.join(catalogDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
          console.log(`✅ SOT créé: ${category}/tuya/${model}`);
        }
      }
    }
    
    console.log('✅ Restauration terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

function determineCategory(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('bulb') || lowerName.includes('light') || lowerName.includes('ts0505')) return 'light';
  if (lowerName.includes('switch') || lowerName.includes('plug') || lowerName.includes('ts0001') || lowerName.includes('ts0002') || lowerName.includes('ts0003') || lowerName.includes('ts011f')) return 'switch';
  if (lowerName.includes('motion') || lowerName.includes('presence')) return 'sensor-motion';
  if (lowerName.includes('temp') || lowerName.includes('therm') || lowerName.includes('ts0201') || lowerName.includes('ts0202') || lowerName.includes('ts0203') || lowerName.includes('ts0205')) return 'sensor-temp';
  if (lowerName.includes('humid')) return 'sensor-humidity';
  if (lowerName.includes('curtain') || lowerName.includes('cover') || lowerName.includes('blind') || lowerName.includes('shade') || lowerName.includes('garage')) return 'cover';
  if (lowerName.includes('lock') || lowerName.includes('deadbolt') || lowerName.includes('padlock') || lowerName.includes('door')) return 'lock';
  
  return 'other';
}

// Exécuter
restoreDrivers().catch(console.error);
