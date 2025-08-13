#!/usr/bin/env node

/**
 * Script de mise à jour du dashboard
 * Met à jour le dashboard avec les dernières informations des drivers
 */

const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function updateDashboard() {
  log('📊 Mise à jour du dashboard...');
  
  try {
    // Lire l'index des drivers
    const driversIndexPath = 'drivers-index.json';
    if (!fs.existsSync(driversIndexPath)) {
      log('❌ Index des drivers non trouvé, exécutez d\'abord reindex-drivers');
      return { success: false, error: 'Drivers index not found' };
    }
    
    const driversIndex = JSON.parse(fs.readFileSync(driversIndexPath, 'utf8'));
    
    // Créer le dossier dashboard s'il n'existe pas
    const dashboardDir = 'dashboard';
    if (!fs.existsSync(dashboardDir)) {
      fs.mkdirSync(dashboardDir, { recursive: true });
    }
    
    // Générer le fichier summary.json
    const summary = {
      timestamp: new Date().toISOString(),
      totalDrivers: driversIndex.length,
      domains: {},
      categories: {},
      manufacturers: {},
      capabilities: {}
    };
    
    // Analyser les drivers
    for (const driver of driversIndex) {
      const [domain, category, vendor, model] = driver.id.split('-');
      
      // Compter par domaine
      summary.domains[domain] = (summary.domains[domain] || 0) + 1;
      
      // Compter par catégorie
      summary.categories[category] = (summary.categories[category] || 0) + 1;
      
      // Compter par fabricant
      summary.manufacturers[vendor] = (summary.manufacturers[vendor] || 0) + 1;
      
      // Compter par capacité
      if (driver.capabilities) {
        for (const cap of driver.capabilities) {
          summary.capabilities[cap] = (summary.capabilities[cap] || 0) + 1;
        }
      }
    }
    
    // Sauvegarder le summary
    const summaryPath = path.join(dashboardDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    // Générer le dashboard HTML
    const htmlContent = generateDashboardHTML(summary, driversIndex);
    const htmlPath = path.join(dashboardDir, 'index.html');
    fs.writeFileSync(htmlPath, htmlContent);
    
    // Générer le rapport
    const report = {
      timestamp: new Date().toISOString(),
      action: 'update-dashboard',
      driversIndexed: driversIndex.length,
      summaryGenerated: true,
      htmlGenerated: true,
      success: true
    };
    
    const reportPath = 'reports/update-dashboard-report.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📊 Dashboard mis à jour: ${dashboardDir}`);
    log(`📄 Summary généré: ${summaryPath}`);
    log(`🌐 HTML généré: ${htmlPath}`);
    log(`📊 Rapport généré: ${reportPath}`);
    
    return {
      success: true,
      driversIndexed: driversIndex.length,
      summaryGenerated: true,
      htmlGenerated: true
    };
    
  } catch (error) {
    log(`💥 Erreur fatale: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function generateDashboardHTML(summary, driversIndex) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Drivers Tuya/Zigbee</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #3498db; }
        .drivers-table { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #ecf0f1; font-weight: bold; }
        .capability { display: inline-block; background: #3498db; color: white; padding: 4px 8px; margin: 2px; border-radius: 15px; font-size: 12px; }
        .search { margin: 20px 0; }
        #searchInput { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Dashboard Drivers Tuya/Zigbee</h1>
            <p>Généré le: ${new Date(summary.timestamp).toLocaleString('fr-FR')}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${summary.totalDrivers}</div>
                <div>Total Drivers</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(summary.domains).length}</div>
                <div>Domaines</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(summary.categories).length}</div>
                <div>Catégories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(summary.manufacturers).length}</div>
                <div>Fabricants</div>
            </div>
        </div>
        
        <div class="search">
            <input type="text" id="searchInput" placeholder="Rechercher un driver..." onkeyup="filterDrivers()">
        </div>
        
        <div class="drivers-table">
            <h2>📋 Liste des Drivers</h2>
            <table id="driversTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nom</th>
                        <th>Capacités</th>
                        <th>Domaine</th>
                        <th>Catégorie</th>
                        <th>Fabricant</th>
                    </tr>
                </thead>
                <tbody>
                    ${driversIndex.map(driver => `
                        <tr>
                            <td><strong>${driver.id}</strong></td>
                            <td>${driver.name?.en || driver.name || 'N/A'}</td>
                            <td>${(driver.capabilities || []).map(cap => `<span class="capability">${cap}</span>`).join('')}</td>
                            <td>${driver.id.split('-')[0]}</td>
                            <td>${driver.id.split('-')[1]}</td>
                            <td>${driver.id.split('-')[2]}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        function filterDrivers() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toLowerCase();
            const table = document.getElementById('driversTable');
            const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                let found = false;
                
                for (let j = 0; j < cells.length; j++) {
                    const cell = cells[j];
                    if (cell.textContent.toLowerCase().indexOf(filter) > -1) {
                        found = true;
                        break;
                    }
                }
                
                row.style.display = found ? '' : 'none';
            }
        }
    </script>
</body>
</html>`;
}

function main() {
  log('🚀 Début de la mise à jour du dashboard...');
  
  const result = updateDashboard();
  
  if (result.success) {
    log('🎉 Dashboard mis à jour avec succès !');
    process.exit(0);
  } else {
    log(`❌ Échec de la mise à jour: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  updateDashboard,
  generateDashboardHTML,
  main
};
