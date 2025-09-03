import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Analysis } from 'llmarena';

const REPORT_PATH = 'analysis/report.json';

async function analyzeHomeyApps() {
  try {
    const response = await axios.get('https://apps.athom.com/api/apps?category=zigbee');
    const apps = response.data;

    const report = {
      analyzedAt: new Date().toISOString(),
      apps: []
    };

    for (const app of apps) {
      if (app.id === 'com.tuya.zigbee') continue;

      const appAnalysis = {
        id: app.id,
        name: app.name,
        version: app.version,
        devices: []
      };

      const manifestResponse = await axios.get(`https://apps.athom.com/api/apps/${app.id}/versions/${app.version}/manifest`);
      const manifest = manifestResponse.data;

      for (const driver of manifest.drivers || []) {
        const driverAnalysis = await Analysis.analyze({
          input: driver,
          task: "Extract device capabilities and metadata from Homey driver manifest"
        });

        appAnalysis.devices.push({
          driverId: driver.id,
          capabilities: driverAnalysis.capabilities,
          metadata: driverAnalysis.metadata
        });
      }

      report.apps.push(appAnalysis);
    }

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Rapport d'analyse sauvegardé à ${REPORT_PATH}`);
  } catch (error) {
    console.error('Erreur lors de l\'analyse des applications:', error);
  }
}

analyzeHomeyApps();
