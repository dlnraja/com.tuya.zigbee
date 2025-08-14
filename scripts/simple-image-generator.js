#!/usr/bin/env node

console.log('🎨 GÉNÉRATEUR D\'IMAGES SIMPLE...');

const fs = require('fs-extra');
const path = require('path');

async function generateImages() {
  try {
    console.log('🔍 Démarrage...');
    
    const projectRoot = process.cwd();
    const driversPath = path.join(projectRoot, 'drivers');
    
    // Créer la structure de base
    await fs.ensureDir(path.join(driversPath, 'tuya_zigbee', 'light', 'assets'));
    await fs.ensureDir(path.join(driversPath, 'tuya_zigbee', 'switch', 'assets'));
    await fs.ensureDir(path.join(driversPath, 'tuya_zigbee', 'sensor-motion', 'assets'));
    
    console.log('✅ Dossiers créés');
    
    // Créer une icône simple pour light
    const lightIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="80" fill="#FFD700"/>
  <text x="128" y="200" text-anchor="middle" fill="white" font-size="20">LIGHT</text>
</svg>`;
    
    await fs.writeFile(path.join(driversPath, 'tuya_zigbee', 'light', 'assets', 'icon.svg'), lightIcon);
    console.log('✅ Icône light créée');
    
    // Créer une icône simple pour switch
    const switchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#34495E"/>
  <rect x="88" y="88" width="80" height="80" fill="#3498DB"/>
  <text x="128" y="200" text-anchor="middle" fill="white" font-size="20">SWITCH</text>
</svg>`;
    
    await fs.writeFile(path.join(driversPath, 'tuya_zigbee', 'switch', 'assets', 'icon.svg'), switchIcon);
    console.log('✅ Icône switch créée');
    
    // Créer une icône simple pour sensor-motion
    const motionIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="60" fill="#E74C3C"/>
  <text x="128" y="200" text-anchor="middle" fill="white" font-size="16">MOTION</text>
</svg>`;
    
    await fs.writeFile(path.join(driversPath, 'tuya_zigbee', 'sensor-motion', 'assets', 'icon.svg'), motionIcon);
    console.log('✅ Icône motion créée');
    
    console.log('🎉 Images générées avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

generateImages();
