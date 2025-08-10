'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const CWD = process.cwd();
const TMP = path.join(CWD, '.tmp_tuya_zip_work');
const RX = /(tuya|com\.tuya|_tz|_ty).*\.(zip|7z)$/i;

// Fonction pour détecter les lecteurs Windows
function drives() {
  const drives = [];
  if (process.platform === 'win32') {
    for (const L of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
      const drive = `${L}:\\`;
      try {
        if (fs.existsSync(drive)) {
          drives.push(drive);
        }
      } catch {
        // Ignorer les erreurs d'accès
      }
    }
  }
  return drives;
}

// Fonction pour scanner récursivement un répertoire
function findZips(roots, limit = 1200) {
  const out = [];
  
  for (const root of roots) {
    try {
      if (!fs.existsSync(root)) continue;
      
      const st = [root];
      while (st.length) {
        const cur = st.pop();
        let s;
        
        try {
          s = fs.statSync(cur);
        } catch {
          continue;
        }
        
        if (s.isDirectory()) {
          for (const e of fs.readdirSync(cur)) {
            const p = path.join(cur, e);
            try {
              const ss = fs.statSync(p);
              if (ss.isDirectory()) {
                st.push(p);
              } else if (ss.isFile() && RX.test(p)) {
                out.push(p);
                if (out.length >= limit) return out;
              }
            } catch {
              // Ignorer les erreurs d'accès
            }
          }
        }
      }
    } catch {
      // Ignorer les erreurs d'accès
    }
  }
  
  return out;
}

// Fonction pour extraire avec 7zip en priorité
async function extract(zip, out) {
  // Essayer d'abord 7zip
  try {
    const sevenZipPath = check7zip();
    if (sevenZipPath) {
      const cmd = `"${sevenZipPath}" x "${zip}" -o"${out}" -y`;
      const result = spawnSync('cmd', ['/c', cmd], { stdio: 'pipe' });
      if (result.status === 0) {
        return { ok: true, method: '7zip' };
      }
    }
  } catch {}
  
  // Fallback: extract-zip
  try {
    const ez = require('extract-zip');
    await ez(zip, { dir: out });
    return { ok: true, method: 'extract-zip' };
  } catch {}
  
  // Fallback: PowerShell Expand-Archive
  if (process.platform === 'win32') {
    try {
      const cmd = `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${out.replace(/'/g, "''")}' -Force`;
      const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { stdio: 'pipe' });
      if (result.status === 0) {
        return { ok: true, method: 'Expand-Archive' };
      }
      return { ok: false, method: 'Expand-Archive', error: result.stderr?.toString() || 'Expand-Archive failed' };
    } catch {}
  }
  
  // Fallback: unzip
  try {
    const result = spawnSync('unzip', ['-o', zip, '-d', out], { stdio: 'pipe' });
    if (result.status === 0) {
      return { ok: true, method: 'unzip' };
    }
    return { ok: false, method: 'unzip', error: result.stderr?.toString() || 'unzip failed' };
  } catch {}
  
  return { ok: false, method: 'none', error: 'No extraction method available' };
}

// Fonction pour vérifier 7zip
function check7zip() {
  const possiblePaths = [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    '7z'
  ];
  
  for (const sevenZipPath of possiblePaths) {
    try {
      spawnSync(`"${sevenZipPath}"`, ['--help'], { stdio: 'pipe' });
      console.log(`✅ 7zip trouvé: ${sevenZipPath}`);
      return sevenZipPath;
    } catch {
      // Continuer à chercher
    }
  }
  
  console.log('⚠️  7zip non trouvé, utilisation des méthodes alternatives');
  return null;
}

// Fonction pour analyser le contenu extrait
function analyzeExtractedContent(extractPath) {
  const analysis = {
    path: extractPath,
    name: path.basename(extractPath),
    hasDriverJson: false,
    hasDriverCompose: false,
    hasAssets: false,
    hasCode: false,
    files: [],
    directories: [],
    driverInfo: null
  };
  
  try {
    const items = fs.readdirSync(extractPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(extractPath, item.name);
      
      if (item.isDirectory()) {
        analysis.directories.push(item.name);
        
        // Vérifier s'il y a des fichiers de driver
        try {
          const subItems = fs.readdirSync(itemPath);
          if (subItems.includes('driver.json') || subItems.includes('driver.compose.json')) {
            analysis.hasDriverJson = subItems.includes('driver.json');
            analysis.hasDriverCompose = subItems.includes('driver.compose.json');
            
            // Lire les informations du driver
            try {
              if (analysis.hasDriverCompose) {
                const composePath = path.join(itemPath, 'driver.compose.json');
                analysis.driverInfo = JSON.parse(fs.readFileSync(composePath, 'utf8'));
              } else if (analysis.hasDriverJson) {
                const jsonPath = path.join(itemPath, 'driver.json');
                analysis.driverInfo = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
              }
            } catch (e) {
              console.log(`⚠️  Erreur lecture config driver: ${e.message}`);
            }
          }
          
          if (subItems.includes('assets')) {
            analysis.hasAssets = true;
          }
          
          if (subItems.some(f => f.endsWith('.js') || f.endsWith('.ts'))) {
            analysis.hasCode = true;
          }
        } catch (e) {
          // Ignorer les erreurs d'accès
        }
      } else {
        analysis.files.push(item.name);
      }
    }
  } catch (e) {
    console.log(`⚠️  Erreur analyse contenu: ${e.message}`);
  }
  
  return analysis;
}

// Fonction principale
(async () => {
  console.log('🚀 INGESTION DES ZIPs TUYA AVEC PROTECTION .tmp*');
  console.log(`📁 Répertoire de travail: ${TMP}`);
  
  // Créer le dossier temporaire (NE PAS SUPPRIMER)
  fs.mkdirSync(TMP, { recursive: true });
  console.log(`📁 Dossier temporaire créé et protégé: ${TMP}`);
  
  const home = os.homedir();
  const roots = [
    CWD,
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
    path.join(home, 'Documents'),
    ...drives()
  ];
  
  console.log(`🔍 Scan des chemins: ${roots.join(', ')}`);
  
  const zips = findZips(roots);
  const summary = {
    searched: roots,
    found: zips.length,
    items: [],
    errors: [],
    processedZips: new Set(), // Éviter les doublons
    totalExtracted: 0
  };
  
  if (!zips.length) {
    console.log('[ingest] Aucun ZIP Tuya trouvé');
    await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(summary, null, 2));
    return;
  }
  
  console.log(`📦 ${zips.length} fichiers ZIP Tuya trouvés`);
  
  for (const src of zips) {
    const base = path.basename(src);
    const dst = path.join(TMP, base);
    
    // Vérifier si ce ZIP a déjà été traité (éviter les doublons)
    try {
      const stats = fs.statSync(src);
      const zipKey = `${base}_${stats.size}`;
      
      if (summary.processedZips.has(zipKey)) {
        console.log(`ℹ️  ZIP déjà traité: ${base}`);
        continue;
      }
      
      summary.processedZips.add(zipKey);
      
      console.log(`🔄 Extraction: ${base} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const extractDirName = `${path.parse(base).name}_${Date.now()}`;
      const extractPath = path.join(TMP, extractDirName);
      
      const result = await extract(src, extractPath);
      
      if (result.ok) {
        summary.totalExtracted++;
        console.log(`✅ Extrait: ${base} → ${extractPath} (${result.method})`);
        
        // Analyser le contenu extrait
        const analysis = analyzeExtractedContent(extractPath);
        summary.items.push({
          source: src,
          extracted: extractPath,
          analysis: analysis,
          method: result.method
        });
        
        // Log des informations du driver
        if (analysis.driverInfo) {
          console.log(`  📋 Driver: ${analysis.name}`);
          if (analysis.driverInfo.manufacturerName) {
            console.log(`    🏭 Fabricant: ${analysis.driverInfo.manufacturerName.join(', ')}`);
          }
          if (analysis.driverInfo.modelId) {
            console.log(`    🏷️  Modèle: ${analysis.driverInfo.modelId.join(', ')}`);
          }
          if (analysis.driverInfo.capabilities) {
            console.log(`    ⚡ Capacités: ${analysis.driverInfo.capabilities.join(', ')}`);
          }
        }
        
      } else {
        console.log(`❌ Échec extraction: ${base} (${result.method}: ${result.error})`);
        summary.errors.push({
          file: base,
          error: result.error,
          method: result.method
        });
      }
      
    } catch (e) {
      console.log(`❌ Erreur traitement ${base}: ${e.message}`);
      summary.errors.push({
        file: base,
        error: e.message
      });
    }
  }
  
  // Sauvegarder le résumé
  const summaryPath = path.join(TMP, 'summary.json');
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n📊 INGESTION TERMINÉE:`);
  console.log(`  📦 Fichiers trouvés: ${summary.found}`);
  console.log(`  ✅ Fichiers extraits: ${summary.totalExtracted}`);
  console.log(`  ❌ Erreurs: ${summary.errors.length}`);
  console.log(`  📁 Dossier temporaire: ${TMP}`);
  console.log(`  📋 Résumé: ${summaryPath}`);
  console.log(`\n📁 CONTENU .tmp* PRÉSERVÉ ET ENRICHI - NE PAS SUPPRIMER !`);
  
  // Afficher les erreurs si il y en a
  if (summary.errors.length > 0) {
    console.log(`\n⚠️  Erreurs rencontrées:`);
    for (const error of summary.errors.slice(0, 5)) {
      console.log(`  - ${error.file}: ${error.error}`);
    }
    if (summary.errors.length > 5) {
      console.log(`  ... et ${summary.errors.length - 5} autres erreurs`);
    }
  }
  
})();
