// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.703Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

// 📦 generate-matrix.js
// Script Node.js pour générer `drivers-matrix.md` et un dashboard HTML

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'drivers');
const OUTPUT_MD = path.resolve(__dirname, '..', 'drivers-matrix.md');
const OUTPUT_HTML = path.resolve(__dirname, '..', 'docs', 'dashboard.html');

function findDrivers(dir = ROOT) {
  const drivers = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === 'driver.compose.json') {
        const jsExists = fs.existsSync(path.join(currentPath, 'driver.js'));
        const relPath = path.relative(ROOT, currentPath);
        const driverInfo = {
          type: relPath.split(path.sep)[0],
          folder: relPath,
          file: 'driver.compose.json',
          json: validateJSON(fullPath),
          js: jsExists,
          enriched: checkEnrichment(fullPath),
          mode: inferMode(relPath),
          capabilities: getCapabilities(fullPath),
          clusters: getClusters(fullPath),
          manufacturer: getManufacturer(fullPath),
          model: getModel(fullPath)
        };
        drivers.push(driverInfo);
      }
    }
  }

  walk(dir);
  return drivers;
}

function validateJSON(filePath) {
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return true;
  } catch {
    return false;
  }
}

function checkEnrichment(filePath) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return json?.metadata?.enriched === true || json?.metadata?.megaPromptVersion;
  } catch {
    return false;
  }
}

function getCapabilities(filePath) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return json?.capabilities || [];
  } catch {
    return [];
  }
}

function getClusters(filePath) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return json?.clusters || [];
  } catch {
    return [];
  }
}

function getManufacturer(filePath) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return json?.manufacturername || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function getModel(filePath) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return json?.model || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function inferMode(folderPath) {
  return folderPath.includes('light') ? 'lite' : 'full';
}

function toMarkdown(drivers) {
  const stats = calculateStats(drivers);
  
  const lines = [
    '# 📊 Matrice des Drivers - Universal TUYA Zigbee Device App',
    '',
    `## 📅 Date`,
    `**${new Date().toLocaleString('fr-FR')}**`,
    '',
    '## 🎯 Objectif',
    '**Matrice complète des drivers disponibles avec leur statut de validation**',
    '',
    '## 📊 Statistiques Globales',
    '',
    '| Métrique | Nombre | Pourcentage |',
    '|----------|--------|-------------|',
    `| **Total Drivers** | ${drivers.length} | 100% |`,
    `| **Validés** | ${stats.valid} | ${Math.round((stats.valid / drivers.length) * 100)}% |`,
    `| **Avertissements** | ${stats.warning} | ${Math.round((stats.warning / drivers.length) * 100)}% |`,
    `| **Erreurs** | ${stats.error} | ${Math.round((stats.error / drivers.length) * 100)}% |`,
    `| **Enrichis** | ${stats.enriched} | ${Math.round((stats.enriched / drivers.length) * 100)}% |`,
    '',
    '## 📋 Matrice Détaillée',
    '',
    '| Type | Nom | Dossier | JSON | JS | Enrichi | Mode | Fabricant | Modèle |',
    '|------|-----|---------|------|----|---------|------|-----------|--------|',
    ...drivers.map(d => `| ${d.type} | ${getDriverName(d)} | \`${d.folder}\` | ${d.json ? '✅' : '❌'} | ${d.js ? '✅' : '❌'} | ${d.enriched ? '✅' : '❌'} | ${d.mode} | ${d.manufacturer} | ${d.model} |`)
  ];
  
  return lines.join('\n');
}

function getDriverName(driver) {
  try {
    const filePath = path.join(ROOT, driver.folder, driver.file);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return json?.name?.en || json?.name || path.basename(driver.folder);
  } catch {
    return path.basename(driver.folder);
  }
}

function calculateStats(drivers) {
  return {
    valid: drivers.filter(d => d.json && d.js).length,
    warning: drivers.filter(d => (d.json && !d.js) || (!d.json && d.js)).length,
    error: drivers.filter(d => !d.json && !d.js).length,
    enriched: drivers.filter(d => d.enriched).length
  };
}

function toHTML(drivers) {
  const stats = calculateStats(drivers);
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚀 Universal TUYA Zigbee Device App - Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .header p {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stat-card h3 {
      color: #667eea;
      margin-bottom: 10px;
    }

    .stat-card .number {
      font-size: 2rem;
      font-weight: bold;
      color: #764ba2;
    }

    .drivers-table {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .table-header {
      background: #667eea;
      color: white;
      padding: 15px 20px;
    }

    .table-header h3 {
      margin: 0;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    th {
      background: #f8f9fa;
      font-weight: bold;
      color: #555;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }

    .status.valid {
      background: #d4edda;
      color: #155724;
    }

    .status.error {
      background: #f8d7da;
      color: #721c24;
    }

    .footer {
      text-align: center;
      margin-top: 30px;
      color: white;
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }
      
      .header h1 {
        font-size: 2rem;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Universal TUYA Zigbee Device App</h1>
      <p>Dashboard - Suivi en temps réel des drivers et de leur statut</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>📦 Total Drivers</h3>
        <div class="number">${drivers.length}</div>
      </div>
      <div class="stat-card">
        <h3>✅ Validés</h3>
        <div class="number">${stats.valid}</div>
      </div>
      <div class="stat-card">
        <h3>⚠️ Avertissements</h3>
        <div class="number">${stats.warning}</div>
      </div>
      <div class="stat-card">
        <h3>❌ Erreurs</h3>
        <div class="number">${stats.error}</div>
      </div>
      <div class="stat-card">
        <h3>🧠 Enrichis</h3>
        <div class="number">${stats.enriched}</div>
      </div>
    </div>

    <div class="drivers-table">
      <div class="table-header">
        <h3>📋 Liste des Drivers</h3>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Nom</th>
              <th>Dossier</th>
              <th>JSON</th>
              <th>JS</th>
              <th>Enrichi</th>
              <th>Mode</th>
              <th>Fabricant</th>
              <th>Modèle</th>
            </tr>
          </thead>
          <tbody>
            ${drivers.map(d => `
              <tr>
                <td>${d.type}</td>
                <td>${getDriverName(d)}</td>
                <td><code>${d.folder}</code></td>
                <td><span class="status ${d.json ? 'valid' : 'error'}">${d.json ? '✅' : '❌'}</span></td>
                <td><span class="status ${d.js ? 'valid' : 'error'}">${d.js ? '✅' : '❌'}</span></td>
                <td><span class="status ${d.enriched ? 'valid' : 'error'}">${d.enriched ? '✅' : '❌'}</span></td>
                <td>${d.mode}</td>
                <td>${d.manufacturer}</td>
                <td>${d.model}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>📅 Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}</p>
      <p>🎯 MEGA-PROMPT ULTIME - VERSION FINALE 2025</p>
    </div>
  </div>
</body>
</html>`;
}

function generate() {
  console.log('🚀 Démarrage de la génération de la matrice des drivers...');
  
  try {
    // Créer le dossier docs s'il n'existe pas
    const docsDir = path.dirname(OUTPUT_HTML);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    const drivers = findDrivers();
    fs.writeFileSync(OUTPUT_MD, toMarkdown(drivers));
    fs.writeFileSync(OUTPUT_HTML, toHTML(drivers));
    
    console.log(`✅ ${drivers.length} drivers analysés et exportés.`);
    console.log(`📄 Markdown généré: ${OUTPUT_MD}`);
    console.log(`🌐 HTML généré: ${OUTPUT_HTML}`);
    
    // Calculer et afficher les statistiques
    const stats = calculateStats(drivers);
    console.log(`📊 Statistiques:`);
    console.log(`   - Total: ${drivers.length}`);
    console.log(`   - Validés: ${stats.valid} (${Math.round((stats.valid / drivers.length) * 100)}%)`);
    console.log(`   - Avertissements: ${stats.warning} (${Math.round((stats.warning / drivers.length) * 100)}%)`);
    console.log(`   - Erreurs: ${stats.error} (${Math.round((stats.error / drivers.length) * 100)}%)`);
    console.log(`   - Enrichis: ${stats.enriched} (${Math.round((stats.enriched / drivers.length) * 100)}%)`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error.message);
  }
}

generate();