#!/usr/bin/env node
'use strict';
/**
 * VALIDATE DRIVER STRUCTURE
 * 
 * Valide la structure complète des drivers :
 * drivers/{tuya|zigbee}/{category}/{vendor}/{model}/
 * 
 * Vérifie :
 * - Profondeur des dossiers (4 niveaux)
 * - Présence des fichiers requis
 * - Cohérence des noms de dossiers
 * - Structure vendors/modèles respectée
 */

const fs=require('fs'),path=require('path');

// Configuration
const ROOT=process.cwd();
const DRIVERS_DIR=path.join(ROOT,'drivers');
const REQUIRED_FILES=['driver.compose.json','device.js'];
const OPTIONAL_FILES=['settings.json','README.md','CHANGELOG.md'];
const ASSETS_FILES=['icon.svg','small.png'];

// Structure attendue
const EXPECTED_STRUCTURE={
  domains:['tuya','zigbee'],
  categories:[
    'light','plug','switch','sensor-motion','sensor-contact','sensor-temperature',
    'sensor-humidity','sensor-gas','sensor-smoke','sensor-water','sensor-vibration',
    'sensor-presence','lock','cover','climate-thermostat','siren','fan','heater',
    'ac','outlet','motion','contact','temperature','humidity','gas','smoke',
    'water','vibration','presence'
  ],
  vendors:['tuya','aqara','ikea','philips','sonoff','ledvance','generic']
};

// Utilitaires
function log(level,message,details=''){
  const emoji={'info':'ℹ️','success':'✅','warning':'⚠️','error':'❌'};
  console.log(`${emoji[level]} [validate-structure] ${message}${details?` - ${details}`:''}`);
}

function validateDriverId(folderPath){
  const parts=folderPath.split(path.sep);
  if(parts.length<4)return{valid:false,reason:'profondeur insuffisante'};
  
  const domain=parts[parts.length-4];
  const category=parts[parts.length-3];
  const vendor=parts[parts.length-2];
  const model=parts[parts.length-1];
  
  // Validation domain
  if(!EXPECTED_STRUCTURE.domains.includes(domain)){
    return{valid:false,reason:`domain invalide: ${domain}`};
  }
  
  // Validation category
  if(!EXPECTED_STRUCTURE.categories.includes(category)){
    return{valid:false,reason:`category invalide: ${category}`};
  }
  
  // Validation vendor
  if(!EXPECTED_STRUCTURE.vendors.includes(vendor)){
    return{valid:false,reason:`vendor invalide: ${vendor}`};
  }
  
  // Validation model (doit être un nom valide)
  if(!model||model.length<1){
    return{valid:false,reason:'nom de modèle manquant'};
  }
  
  // Validation format ID
  const expectedId=`${category}-${vendor}-${model}`;
  
  return{valid:true,domain,category,vendor,model,expectedId};
}

function validateDriverFiles(driverPath){
  const issues=[];
  const missing=[];
  
  // Fichiers requis
  for(const file of REQUIRED_FILES){
    const filePath=path.join(driverPath,file);
    if(!fs.existsSync(filePath)){
      missing.push(file);
      issues.push(`Fichier requis manquant: ${file}`);
    }
  }
  
  // Fichiers optionnels (warning seulement)
  for(const file of OPTIONAL_FILES){
    const filePath=path.join(driverPath,file);
    if(!fs.existsSync(filePath)){
      log('warning',`Fichier optionnel manquant: ${file}`,driverPath);
    }
  }
  
  // Assets
  const assetsDir=path.join(driverPath,'assets');
  if(!fs.existsSync(assetsDir)){
    missing.push('assets/');
    issues.push('Dossier assets manquant');
  }else{
    for(const asset of ASSETS_FILES){
      const assetPath=path.join(assetsDir,asset);
      if(!fs.existsSync(assetPath)){
        missing.push(`assets/${asset}`);
        issues.push(`Asset manquant: ${asset}`);
      }
    }
  }
  
  return{issues,missing,hasRequiredFiles:missing.length===0};
}

function validateDriverCompose(driverPath){
  const composePath=path.join(driverPath,'driver.compose.json');
  if(!fs.existsSync(composePath))return{valid:false,reason:'driver.compose.json manquant'};
  
  try{
    const compose=JSON.parse(fs.readFileSync(composePath,'utf8'));
    
    // Validation ID
    if(!compose.id){
      return{valid:false,reason:'ID manquant dans driver.compose.json'};
    }
    
    // Validation structure ID
    const parts=compose.id.split('-');
    if(parts.length<3){
      return{valid:false,reason:`ID invalide: ${compose.id} (format attendu: category-vendor-model)`};
    }
    
    // Validation cohérence avec le chemin
    const folderParts=driverPath.split(path.sep);
    const expectedId=`${folderParts[folderParts.length-3]}-${folderParts[folderParts.length-2]}-${folderParts[folderParts.length-1]}`;
    
    if(compose.id!==expectedId){
      return{valid:false,reason:`ID ${compose.id} ne correspond pas au chemin ${expectedId}`};
    }
    
    return{valid:true,id:compose.id,expectedId};
    
  }catch(e){
    return{valid:false,reason:`Erreur parsing JSON: ${e.message}`};
  }
}

// Fonction principale
function validateStructure(){
  log('info','Début de la validation de la structure drivers...');
  
  if(!fs.existsSync(DRIVERS_DIR)){
    log('error','Dossier drivers/ introuvable');
    return{valid:false,errors:['Dossier drivers/ introuvable']};
  }
  
  const results={
    total:0,
    valid:0,
    invalid:0,
    errors:[],
    warnings:[],
    details:{}
  };
  
  // Parcours récursif des drivers
  function walkDrivers(dir,currentDepth=0){
    if(!fs.existsSync(dir))return;
    
    const items=fs.readdirSync(dir,{withFileTypes:true});
    
    for(const item of items){
      const itemPath=path.join(dir,item.name);
      
      if(item.isDirectory()){
        if(currentDepth===3){
          // Niveau modèle - validation driver
          results.total++;
          log('info',`Validation driver: ${path.relative(DRIVERS_DIR,itemPath)}`);
          
          // Validation structure
          const structureValid=validateDriverId(itemPath);
          if(!structureValid.valid){
            results.invalid++;
            results.errors.push(`Structure invalide: ${itemPath} - ${structureValid.reason}`);
            log('error',`Structure invalide: ${structureValid.reason}`,itemPath);
            continue;
          }
          
          // Validation fichiers
          const filesValid=validateDriverFiles(itemPath);
          if(!filesValid.hasRequiredFiles){
            results.invalid++;
            results.errors.push(`Fichiers manquants: ${itemPath} - ${filesValid.missing.join(', ')}`);
            log('error',`Fichiers manquants: ${filesValid.missing.join(', ')}`,itemPath);
            continue;
          }
          
          // Validation driver.compose.json
          const composeValid=validateDriverCompose(itemPath);
          if(!composeValid.valid){
            results.invalid++;
            results.errors.push(`Driver.compose invalide: ${itemPath} - ${composeValid.reason}`);
            log('error',`Driver.compose invalide: ${composeValid.reason}`,itemPath);
            continue;
          }
          
          // Driver valide
          results.valid++;
          results.details[itemPath]={
            structure:structureValid,
            files:filesValid,
            compose:composeValid
          };
          
          log('success',`Driver valide: ${composeValid.id}`,itemPath);
          
        }else if(currentDepth<3){
          // Niveaux intermédiaires - continuer
          walkDrivers(itemPath,currentDepth+1);
        }
      }
    }
  }
  
  // Lancement de la validation
  walkDrivers(DRIVERS_DIR);
  
  // Rapport final
  log('info','Validation terminée');
  console.log('\n📊 RAPPORT DE VALIDATION STRUCTURE:');
  console.log(`   📁 Total drivers: ${results.total}`);
  console.log(`   ✅ Valides: ${results.valid}`);
  console.log(`   ❌ Invalides: ${results.invalid}`);
  console.log(`   📊 Taux de succès: ${results.total>0?Math.round((results.valid/results.total)*100):0}%`);
  
  if(results.errors.length>0){
    console.log('\n❌ ERREURS DÉTECTÉES:');
    for(const error of results.errors.slice(0,10)){ // Limite à 10 erreurs
      console.log(`   - ${error}`);
    }
    if(results.errors.length>10){
      console.log(`   ... et ${results.errors.length-10} autres erreurs`);
    }
  }
  
  if(results.warnings.length>0){
    console.log('\n⚠️ AVERTISSEMENTS:');
    for(const warning of results.warnings.slice(0,5)){
      console.log(`   - ${warning}`);
    }
  }
  
  // Sauvegarde du rapport
  const reportPath=path.join(ROOT,'STRUCTURE_VALIDATION_REPORT.md');
  const reportContent=`# Rapport de Validation Structure - ${new Date().toISOString()}

## Résumé
- **Total drivers**: ${results.total}
- **Valides**: ${results.valid}
- **Invalides**: ${results.invalid}
- **Taux de succès**: ${results.total>0?Math.round((results.valid/results.total)*100):0}%

## Structure attendue
\`\`\`
drivers/
├── {tuya|zigbee}/           # Domain
│   ├── {category}/          # Category (light, plug, sensor-motion, etc.)
│   │   ├── {vendor}/        # Vendor (tuya, aqara, ikea, philips, sonoff, ledvance, generic)
│   │   │   └── {model}/     # Model (nom spécifique)
│   │   │       ├── driver.compose.json  # REQUIS
│   │   │       ├── device.js            # REQUIS
│   │   │       ├── assets/
│   │   │       │   ├── icon.svg        # REQUIS
│   │   │       │   └── small.png       # REQUIS
│   │   │       ├── settings.json       # OPTIONNEL
│   │   │       ├── README.md           # OPTIONNEL
│   │   │       └── CHANGELOG.md        # OPTIONNEL
\`\`\`

## Format ID attendu
\`\`\`
<category>-<vendor>-<model>
\`\`\`

## Erreurs détectées
${results.errors.length>0?results.errors.map(e=>`- ${e}`).join('\n'):'Aucune erreur'}

## Avertissements
${results.warnings.length>0?results.warnings.map(w=>`- ${w}`).join('\n'):'Aucun avertissement'}
`;
  
  fs.writeFileSync(reportPath,reportContent);
  log('success',`Rapport sauvegardé: ${reportPath}`);
  
  return{
    valid:results.invalid===0,
    total:results.total,
    valid:results.valid,
    invalid:results.invalid,
    reportPath
  };
}

// Lancement
if(require.main===module){
  const result=validateStructure();
  process.exitCode=result.valid?0:1;
}

module.exports={validateStructure,EXPECTED_STRUCTURE};
