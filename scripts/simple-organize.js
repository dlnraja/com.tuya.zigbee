#!/usr/bin/env node

console.log('📁 ORGANISATION SIMPLE DES DRIVERS...');

const fs = require('fs-extra');
const path = require('path');

async function organizeDrivers() {
  try {
    const projectRoot = process.cwd();
    const driversPath = path.join(projectRoot, 'drivers');
    
    console.log('🔍 Analyse de la structure...');
    
    // Créer les catégories dans tuya_zigbee
    const tuyaPath = path.join(driversPath, 'tuya_zigbee');
    const categories = ['light', 'switch', 'sensor-motion', 'sensor-temp', 'sensor-humidity', 'cover', 'lock', 'other'];
    
    for (const category of categories) {
      const categoryPath = path.join(tuyaPath, category);
      await fs.ensureDir(categoryPath);
      console.log(`✅ Créé: tuya_zigbee/${category}/`);
    }
    
    // Créer les catégories dans zigbee
    const zigbeePath = path.join(driversPath, 'zigbee');
    for (const category of categories) {
      const categoryPath = path.join(zigbeePath, category);
      await fs.ensureDir(categoryPath);
      console.log(`✅ Créé: zigbee/${category}/`);
    }
    
    // Organiser les drivers depuis models
    const modelsPath = path.join(tuyaPath, 'models');
    if (await fs.pathExists(modelsPath)) {
      const models = await fs.readdir(modelsPath);
      console.log(`📊 Trouvé ${models.length} modèles à organiser`);
      
      for (const model of models) {
        const modelPath = path.join(modelsPath, model);
        const stats = await fs.stat(modelPath);
        
        if (stats.isDirectory()) {
          const category = determineCategory(model);
          const targetPath = path.join(tuyaPath, category, model);
          
          if (!await fs.pathExists(targetPath)) {
            await fs.move(modelPath, targetPath);
            console.log(`✅ Déplacé: ${model} -> ${category}/`);
          }
        }
      }
    }
    
    console.log('✅ Organisation terminée !');
    
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
organizeDrivers().catch(console.error);
