'use strict';
const fs=require('fs'),path=require('path');

const SCRIPTS_DIR=path.join(process.cwd(),'scripts');

// Scripts à conserver (les nouveaux scripts JavaScript)
const KEEP_SCRIPTS=[
  'mega-verify-enrich.js',
  'reorganize-drivers.js',
  'migrate-meshdriver-to-zigbeedriver.js',
  'enrich-drivers.js',
  'verify-coherence-and-enrich.js',
  'update-readme.js',
  'reindex-drivers.js',
  'assets-generate.js',
  'ingest-tuya-zips.js',
  'fix-package.js',
  'create-small-png.js',
  'cleanup-obsolete.js',
  'normalize-backup.js'
];

// Scripts obsolètes à supprimer
const OBSOLETE_SCRIPTS=[
  'mega-tuya-ultimate.js',
  'reorganize-drivers-ultimate.js',
  'restore-tmp-sources.js',
  'mega-verify-enrich-updated.js',
  'reorganize-drivers-complete.js',
  'mega-verify-enrich.js',
  'mega.js',
  'simple-reorg.js',
  'run-final-reorg.bat',
  'run-final-reorg.ps1',
  'reorganize-drivers-final.js',
  'cleanup-and-reorganize-drivers.js',
  'final-reorganize.ps1',
  'cleanup-drivers.bat',
  'cleanup-and-reorganize.ps1',
  'test-reorganize.js',
  'update-version-and-metadata.js',
  'mega-ultimate-orchestrator.js',
  'enrich-from-tmp-sources.js',
  'mega-ultimate-factorized.js',
  'generate-missing-assets.js',
  'scan-extract-tuya-7zip.js'
];

function cleanupObsoleteScripts(){
  console.log('[cleanup] Starting cleanup of obsolete scripts...');
  
  if(!fs.existsSync(SCRIPTS_DIR)){
    console.log('[cleanup] scripts/ directory not found');
    return;
  }
  
  const files=fs.readdirSync(SCRIPTS_DIR);
  let deleted=0;
  let kept=0;
  
  for(const file of files){
    const filePath=path.join(SCRIPTS_DIR,file);
    const stat=fs.statSync(filePath);
    
    if(stat.isFile()){
      // Supprimer les scripts PowerShell et batch
      if(file.endsWith('.ps1') || file.endsWith('.bat')){
        try{
          fs.unlinkSync(filePath);
          console.log(`[cleanup] Deleted PowerShell/Batch: ${file}`);
          deleted++;
        }catch(e){
          console.log(`[cleanup] Could not delete ${file}:`,e.message);
        }
        continue;
      }
      
      // Supprimer les scripts JavaScript obsolètes
      if(file.endsWith('.js') && OBSOLETE_SCRIPTS.includes(file)){
        try{
          fs.unlinkSync(filePath);
          console.log(`[cleanup] Deleted obsolete JS: ${file}`);
          deleted++;
        }catch(e){
          console.log(`[cleanup] Could not delete ${file}:`,e.message);
        }
        continue;
      }
      
      // Garder les scripts JavaScript valides
      if(file.endsWith('.js') && KEEP_SCRIPTS.includes(file)){
        kept++;
        continue;
      }
      
      // Garder les autres fichiers (utils/, core/, etc.)
      if(stat.isDirectory()){
        kept++;
        continue;
      }
      
      // Supprimer les autres fichiers non reconnus
      if(file.endsWith('.js')){
        try{
          fs.unlinkSync(filePath);
          console.log(`[cleanup] Deleted unrecognized JS: ${file}`);
          deleted++;
        }catch(e){
          console.log(`[cleanup] Could not delete ${file}:`,e.message);
        }
      }
    }
  }
  
  console.log(`[cleanup] Cleanup complete: ${deleted} deleted, ${kept} kept`);
  console.log(`[cleanup] Kept scripts: ${KEEP_SCRIPTS.join(', ')}`);
}

// Exécuter le nettoyage
cleanupObsoleteScripts();
