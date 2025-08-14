#!/usr/bin/env node

console.log('🔧 CORRECTION SIMPLE DE LA STRUCTURE...');

const fs = require('fs-extra');
const path = require('path');

async function fixStructure() {
  try {
    const projectRoot = process.cwd();
    const tuyaPath = path.join(projectRoot, 'drivers', 'tuya_zigbee');
    
    console.log('📁 Correction des dossiers mal placés...');
    
    // Déplacer les dossiers tuya_ac_* vers la catégorie ac
    const rootItems = await fs.readdir(tuyaPath);
    
    for (const item of rootItems) {
      if (item.startsWith('tuya_ac_')) {
        const sourcePath = path.join(tuyaPath, item);
        const targetPath = path.join(tuyaPath, 'ac', item);
        
        const stats = await fs.stat(sourcePath);
        if (stats.isDirectory()) {
          try {
            if (!await fs.pathExists(targetPath)) {
              await fs.move(sourcePath, targetPath);
              console.log(`✅ Déplacé: ${item} -> ac/`);
            } else {
              // Si la destination existe, fusionner
              await mergeDrivers(sourcePath, targetPath);
              await fs.remove(sourcePath);
              console.log(`✅ Fusionné et supprimé: ${item}`);
            }
          } catch (error) {
            console.log(`⚠️ Erreur avec ${item}: ${error.message}`);
          }
        }
      }
    }
    
    // Supprimer les dossiers vides
    await cleanupEmptyDirectories(tuyaPath);
    
    console.log('✅ Structure corrigée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function mergeDrivers(sourcePath, targetPath) {
  try {
    // Fusionner les fichiers de configuration
    const sourceCompose = path.join(sourcePath, 'driver.compose.json');
    const targetCompose = path.join(targetPath, 'driver.compose.json');
    
    if (await fs.pathExists(sourceCompose) && await fs.pathExists(targetCompose)) {
      const source = JSON.parse(await fs.readFile(sourceCompose, 'utf8'));
      const target = JSON.parse(await fs.readFile(targetCompose, 'utf8'));
      
      // Fusionner les capacités
      if (source.capabilities) {
        if (!target.capabilities) target.capabilities = [];
        target.capabilities = [...new Set([...target.capabilities, ...source.capabilities])];
      }
      
      // Fusionner les clusters
      if (source.clusters) {
        if (!target.clusters) target.clusters = [];
        target.clusters = [...new Set([...target.clusters, ...source.clusters])];
      }
      
      await fs.writeFile(targetCompose, JSON.stringify(target, null, 2));
    }
    
    // Copier les assets manquants
    const sourceAssets = path.join(sourcePath, 'assets');
    const targetAssets = path.join(targetPath, 'assets');
    
    if (await fs.pathExists(sourceAssets)) {
      if (!await fs.pathExists(targetAssets)) {
        await fs.copy(sourceAssets, targetAssets);
      }
    }
    
  } catch (error) {
    console.log(`⚠️ Erreur lors de la fusion: ${error.message}`);
  }
}

async function cleanupEmptyDirectories(dirPath) {
  if (!await fs.pathExists(dirPath)) return;
  
  const items = await fs.readdir(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await cleanupEmptyDirectories(fullPath);
      
      // Vérifier si le dossier est vide après récursion
      const remainingItems = await fs.readdir(fullPath);
      if (remainingItems.length === 0) {
        await fs.remove(fullPath);
        console.log(`🗑️ Supprimé dossier vide: ${fullPath}`);
      }
    }
  }
}

// Exécuter
fixStructure().catch(console.error);
