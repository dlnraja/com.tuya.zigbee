#!/usr/bin/env node

/**
 * Script pour mettre à jour la matrice des appareils Tuya Zigbee
 * Ce script est conçu pour être exécuté dans le cadre du workflow d'enrichissement mensuel
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const MATRIX_FILE = path.join(DATA_DIR, 'device_matrix.csv');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.csv');

// En-têtes de la matrice des appareils
const MATRIX_HEADERS = [
  'manufacturer',
  'model',
  'model_id',
  'vendor',
  'description',
  'supports',
  'from_zigbee',
  'to_zigbee',
  'exposes',
  'options',
  'meta',
  'sources',
  'status',
  'last_updated',
  'reliability_score',
  'notes'
];

// Sources de données par défaut
const DEFAULT_SOURCES = [
  {
    name: 'Tuya Zigbee Home Assistant Integration',
    url: 'https://www.home-assistant.io/integrations/zha/',
    type: 'documentation',
    reliability: 0.9
  },
  {
    name: 'Zigbee2MQTT Device Database',
    url: 'https://www.zigbee2mqtt.io/information/supported_devices.html',
    type: 'documentation',
    reliability: 0.95
  },
  {
    name: 'Tuya Official Documentation',
    url: 'https://developer.tuya.com/en/docs/iot/',
    type: 'documentation',
    reliability: 0.8
  }
];

/**
 * Initialise la structure de dossiers et fichiers nécessaires
 */
async function initialize() {
  try {
    // Créer le répertoire data s'il n'existe pas
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Créer le fichier sources.csv avec les sources par défaut s'il n'existe pas
    try {
      await fs.access(SOURCES_FILE);
      console.log(chalk.green('✓ Sources file already exists'));
    } catch (error) {
      const sourcesCsv = 'name,url,type,reliability,last_checked,notes\n' +
        DEFAULT_SOURCES.map(s => 
          `"${s.name}","${s.url}",${s.type},${s.reliability},,"${s.notes || ''}"`
        ).join('\n');
      
      await fs.writeFile(SOURCES_FILE, sourcesCsv, 'utf8');
      console.log(chalk.green('✓ Created default sources file'));
    }
    
    // Créer le fichier device_matrix.csv avec l'en-tête s'il n'existe pas
    try {
      await fs.access(MATRIX_FILE);
      console.log(chalk.green('✓ Device matrix file already exists'));
    } catch (error) {
      await fs.writeFile(MATRIX_FILE, MATRIX_HEADERS.join(',') + '\n', 'utf8');
      console.log(chalk.green('✓ Created empty device matrix file'));
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error initializing files:'), error);
    process.exit(1);
  }
}

/**
 * Met à jour la matrice des appareils avec les données des pilotes existants
 */
async function updateDeviceMatrix() {
  try {
    console.log(chalk.blue('\nUpdating device matrix...'));
    
    // Lire les pilotes existants
    const drivers = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
    const driverDirs = drivers
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(chalk.blue(`Found ${driverDirs.length} driver directories`));
    
    // Lire la matrice existante
    let existingMatrix = [];
    try {
      const matrixContent = await fs.readFile(MATRIX_FILE, 'utf8');
      const lines = matrixContent.trim().split('\n');
      const headers = lines[0].split(',');
      
      // Convertir les lignes en objets avec les en-têtes comme clés
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const entry = {};
        headers.forEach((header, index) => {
          entry[header] = values[index] || '';
        });
        existingMatrix.push(entry);
      }
    } catch (error) {
      console.warn(chalk.yellow('No existing matrix found, starting fresh'));
    }
    
    // Mettre à jour la matrice avec les pilotes existants
    const updatedMatrix = [...existingMatrix];
    const now = new Date().toISOString().split('T')[0];
    
    for (const driverDir of driverDirs) {
      const driverPath = path.join(DRIVERS_DIR, driverDir);
      const driverJsonPath = path.join(driverPath, 'driver.compose.json');
      
      try {
        // Lire le fichier de configuration du pilote
        const driverConfig = JSON.parse(await fs.readFile(driverJsonPath, 'utf8'));
        
        // Vérifier si le pilote existe déjà dans la matrice
        const existingDriverIndex = updatedMatrix.findIndex(
          entry => entry.model_id === driverDir
        );
        
        const driverData = {
          manufacturer: driverConfig.manufacturer || 'Tuya',
          model: driverConfig.model || '',
          model_id: driverDir,
          vendor: driverConfig.vendor || 'Tuya',
          description: driverConfig.description || '',
          supports: JSON.stringify(driverConfig.capabilities || []),
          from_zigbee: JSON.stringify(driverConfig.fromZigbee || []),
          to_zigbee: JSON.stringify(driverConfig.toZigbee || []),
          exposes: JSON.stringify(driverConfig.exposes || []),
          options: JSON.stringify(driverConfig.options || {}),
          meta: JSON.stringify(driverConfig.meta || {}),
          sources: JSON.stringify([`driver:${driverDir}`]),
          status: 'supported',
          last_updated: now,
          reliability_score: '0.8',
          notes: 'Added by update script'
        };
        
        if (existingDriverIndex >= 0) {
          // Mettre à jour l'entrée existante
          updatedMatrix[existingDriverIndex] = {
            ...updatedMatrix[existingDriverIndex],
            ...driverData,
            last_updated: now
          };
          console.log(chalk.blue(`✓ Updated ${driverDir}`));
        } else {
          // Ajouter une nouvelle entrée
          updatedMatrix.push(driverData);
          console.log(chalk.green(`+ Added ${driverDir}`));
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Error processing ${driverDir}:`), error.message);
      }
    }
    
    // Écrire la matrice mise à jour dans le fichier
    const csvContent = [
      MATRIX_HEADERS.join(','),
      ...updatedMatrix.map(entry => 
        MATRIX_HEADERS.map(header => 
          typeof entry[header] === 'string' ? 
            `"${entry[header].replace(/"/g, '""')}"` : 
            `"${JSON.stringify(entry[header] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');
    
    await fs.writeFile(MATRIX_FILE, csvContent, 'utf8');
    console.log(chalk.green(`\n✓ Successfully updated device matrix with ${updatedMatrix.length} devices`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error updating device matrix:'), error);
    process.exit(1);
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue.bold('\n=== Tuya Zigbee Device Matrix Updater ===\n'));
  
  // Initialiser la structure de fichiers
  await initialize();
  
  // Mettre à jour la matrice des appareils
  await updateDeviceMatrix();
  
  console.log(chalk.green.bold('\n✓ Update completed successfully!\n'));
}

// Exécuter le script
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
