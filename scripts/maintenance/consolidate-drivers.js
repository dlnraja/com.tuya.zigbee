const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// Define targets to unify into
const TARGETS = {
  '1_gang': 'switch_1_gang',
  '2_gang': 'switch_2_gang',
  '3_gang': 'switch_3_gang',
  '4_gang': 'switch_4_gang'
};

// Patterns to detect deprecated drivers
const PATTERNS = {
  '1_gang': ['switch_1gang', 'wall_switch_1gang_1way', 'wall_switch_1_gang', 'wall_switch_1_gang_tuya'],
  '2_gang': ['switch_2gang', 'wall_switch_2gang_1way', 'wall_switch_2_gang'],
  '3_gang': ['switch_3gang', 'wall_switch_3gang_1way', 'wall_switch_3_gang'],
  '4_gang': ['switch_4gang', 'wall_switch_4gang_1way', 'wall_switch_4_gang', 'wall_switch_4_gang_tuya']
};

console.log('🚀 Démarrage de la Consolidation Massive des Drivers...');

let totalMigrated = 0;

for (const [gangType, targetDir] of Object.entries(TARGETS)) {
  const targetComposePath = path.join(DRIVERS_DIR, targetDir, 'driver.compose.json');
  if (!fs.existsSync(targetComposePath)) continue;

  const targetCompose = JSON.parse(fs.readFileSync(targetComposePath, 'utf8'));
  targetCompose.zigbee = targetCompose.zigbee || { manufacturerName: [] };
  const targetMfrs = new Set(targetCompose.zigbee.manufacturerName);

  const sources = PATTERNS[gangType];
  for (const sourceDir of sources) {
    const sourceComposePath = path.join(DRIVERS_DIR, sourceDir, 'driver.compose.json');
    if (!fs.existsSync(sourceComposePath)) continue;

    const sourceCompose = JSON.parse(fs.readFileSync(sourceComposePath, 'utf8'));
    const sourceMfrs = sourceCompose.zigbee?.manufacturerName || [];

    // Migrate fingerprints
    let migratedCount = 0;
    for (const mfr of sourceMfrs) {
      if (!targetMfrs.has(mfr)) {
        targetMfrs.add(mfr);
        targetCompose.zigbee.manufacturerName.push(mfr);
        migratedCount++;
        totalMigrated++;
      }
    }

    // Mark old driver as deprecated
    if (!sourceCompose.deprecated) {
      sourceCompose.deprecated = true;
      fs.writeFileSync(sourceComposePath, JSON.stringify(sourceCompose, null, 2));
      console.log(`📌 Marqué ${sourceDir} comme déprécié (migration de ${migratedCount} empreintes).`);
    }
  }

  // Save updated target driver
  targetCompose.zigbee.manufacturerName.sort();
  fs.writeFileSync(targetComposePath, JSON.stringify(targetCompose, null, 2));
  console.log(`✅ Mis à jour ${targetDir} avec les nouvelles empreintes unifiées.`);
}

console.log(`🎉 Consolidation terminée ! ${totalMigrated} empreintes uniques ont été unifiées.`);
