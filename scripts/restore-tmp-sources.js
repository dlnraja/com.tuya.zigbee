'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const TMP = path.join(ROOT, '.tmp_tuya_zip_work');
const BACKUP = path.join(ROOT, '.backup', 'zips');

function extractZip(zipPath, outDir) {
  console.log(`[restore] Extracting ${path.basename(zipPath)} to ${path.relative(ROOT, outDir)}`);
  
  try {
    // Essayer extract-zip d'abord
    const extractZip = require('extract-zip');
    return new Promise((resolve) => {
      extractZip(zipPath, { dir: outDir })
        .then(() => resolve({ ok: true, method: 'extract-zip' }))
        .catch(() => {
          // Fallback vers PowerShell sur Windows
          if (process.platform === 'win32') {
            const cmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`;
            const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { stdio: 'pipe' });
            
            if (result.status === 0) {
              resolve({ ok: true, method: 'Expand-Archive' });
            } else {
              resolve({ ok: false, method: 'Expand-Archive', error: result.stderr?.toString() || 'Expand-Archive failed' });
            }
          } else {
            // Fallback vers unzip sur Unix
            const result = spawnSync('unzip', ['-o', zipPath, '-d', outDir], { stdio: 'pipe' });
            
            if (result.status === 0) {
              resolve({ ok: true, method: 'unzip' });
            } else {
              resolve({ ok: false, method: 'unzip', error: result.stderr?.toString() || 'unzip failed' });
            }
          }
        });
    });
  } catch (error) {
    console.error(`[restore] Error extracting ${zipPath}:`, error.message);
    return { ok: false, method: 'unknown', error: error.message };
  }
}

async function restoreTmpSources() {
  console.log('[restore] Restoring .tmp_tuya_zip_work from backups...');
  
  // 1. Créer le dossier .tmp_tuya_zip_work
  if (!fs.existsSync(TMP)) {
    fs.mkdirSync(TMP, { recursive: true });
    console.log('[restore] Created .tmp_tuya_zip_work directory');
  }
  
  // 2. Vérifier les backups
  if (!fs.existsSync(BACKUP)) {
    console.log('[restore] No .backup/zips directory found');
    return;
  }
  
  const backupFiles = fs.readdirSync(BACKUP, { withFileTypes: true })
    .filter(f => f.isFile() && /\.zip$/i.test(f.name))
    .map(f => path.join(BACKUP, f.name));
  
  if (backupFiles.length === 0) {
    console.log('[restore] No ZIP files found in backups');
    return;
  }
  
  console.log(`[restore] Found ${backupFiles.length} backup ZIP files`);
  
  // 3. Extraire chaque backup
  for (const zipFile of backupFiles) {
    const baseName = path.basename(zipFile, '.zip');
    const outDir = path.join(TMP, baseName);
    
    // Vérifier si déjà extrait
    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
      console.log(`[restore] ${baseName} already extracted, skipping`);
      continue;
    }
    
    const result = await extractZip(zipFile, outDir);
    
    if (result.ok) {
      console.log(`[restore] ✓ ${baseName} extracted successfully (${result.method})`);
      
      // Vérifier le contenu extrait
      const extractedFiles = fs.readdirSync(outDir, { withFileTypes: true });
      const hasDrivers = extractedFiles.some(f => 
        f.isDirectory() && fs.existsSync(path.join(outDir, f.name, 'driver.compose.json'))
      );
      
      if (hasDrivers) {
        console.log(`[restore] ✓ ${baseName} contains driver files`);
      } else {
        console.log(`[restore] ⚠ ${baseName} extracted but no driver files found`);
      }
    } else {
      console.log(`[restore] ✗ ${baseName} extraction failed: ${result.error}`);
    }
  }
  
  // 4. Créer un rapport de restauration
  const report = {
    timestamp: new Date().toISOString(),
    tmpDir: path.relative(ROOT, TMP),
    backupSource: path.relative(ROOT, BACKUP),
    extractedSources: [],
    errors: []
  };
  
  if (fs.existsSync(TMP)) {
    const tmpContents = fs.readdirSync(TMP, { withFileTypes: true })
      .filter(f => f.isDirectory())
      .map(f => f.name);
    
    report.extractedSources = tmpContents;
  }
  
  const reportPath = path.join(TMP, 'restore-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`[restore] Restore complete! Report saved to ${path.relative(ROOT, reportPath)}`);
  console.log(`[restore] .tmp_tuya_zip_work is now ready for driver enrichment`);
}

restoreTmpSources().catch(error => {
  console.error('[restore] Fatal error:', error);
  process.exitCode = 1;
});
