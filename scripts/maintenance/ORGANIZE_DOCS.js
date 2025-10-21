#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ORGANIZE DOCUMENTATION
 * Range tous les fichiers .md dans une structure propre
 */

const DOCS_STRUCTURE = {
  'forum-responses': [
    'FORUM_RESPONSE_FOR_CAM.md',
    'FORUM_RESPONSE_FOR_PETER.md',
    'FORUM_RESPONSE_CAM_PETER.md',
    'COMMUNITY_RESPONSE_CAM.md',
    'FORUM_ANALYSIS_COMPLETE.md'
  ],
  'diagnostics': [
    'DIAGNOSTIC_RESPONSE_1c9d6ce6.md',
    'HOBEIAN_ISSUES_ANALYSIS_COMPLETE.md',
    'HOBEIAN_ZG204Z_DEBUG_REPORT.md',
    'CRITICAL_IAS_ZONE_FIX_v2.15.81.md',
    'IAS_ZONE_FIX_v2.15.71_COMPLETE.md'
  ],
  'releases': [
    'COMPLETE_FIX_REPORT_v2.15.59.md',
    'ENERGY_AND_UNBRANDED_REPORT_v2.15.61.md',
    'ENRICHMENT_REPORT_v2.15.60.md',
    'FINAL_STATUS_REPORT.md',
    'FINAL_STATUS_v2.15.72.md',
    'SESSION_COMPLETE_FINAL_v2.15.62.md',
    'SESSION_SUMMARY_2025-10-13.md',
    'SUMMARY_SESSION_2025-10-13.md',
    'ULTIMATE_AUDIT_REPORT_v2.15.60.md',
    'UX_FIX_SUMMARY_v2.15.64.md'
  ],
  'guides': [
    'DRIVER_SELECTION_GUIDE.md',
    'SETUP_HOMEY_TOKEN.md',
    'UX_IMPROVEMENT_PLAN.md',
    'CONTRIBUTING.md'
  ],
  'project-status': [
    'APP_STORE_STATUS.md',
    'CERTIFICATION_READY.md',
    'READY_TO_PUBLISH.md',
    'TRIGGER_PUBLISH.md',
    'VISUAL_ASSETS_COMPLETE.md',
    'IMAGE_FIX_SUMMARY.md'
  ],
  'audits': [
    'PROJECT_AUDIT_v2.15.56.md',
    'NAMING_AUDIT_REPORT.md',
    'DRIVER_RENAMES_v2.15.55.md',
    'BATTERY_INTELLIGENCE_SYSTEM.md'
  ],
  'github-issues': [
    'FIX_GITHUB_ISSUES_1267_1268.md',
    'GITHUB_ISSUES_ANALYSIS.md',
    'GITHUB_ACTIONS_HOTFIX.md'
  ]
};

async function organizeDocumentation() {
  const rootDir = path.join(__dirname, '../..');
  const docsDir = path.join(rootDir, 'docs');
  
  console.log('📚 ORGANIZING DOCUMENTATION\n');
  
  let moved = 0;
  let errors = 0;
  
  // Create subdirectories
  for (const subdir of Object.keys(DOCS_STRUCTURE)) {
    const targetDir = path.join(docsDir, subdir);
    try {
      await fs.mkdir(targetDir, { recursive: true });
      console.log(`✅ Created: docs/${subdir}/`);
    } catch (err) {
      // Directory might already exist
    }
  }
  
  // Move files
  for (const [subdir, files] of Object.entries(DOCS_STRUCTURE)) {
    const targetDir = path.join(docsDir, subdir);
    
    for (const file of files) {
      const sourcePath = path.join(rootDir, file);
      const targetPath = path.join(targetDir, file);
      
      try {
        // Check if source exists
        await fs.access(sourcePath);
        
        // Move file
        await fs.rename(sourcePath, targetPath);
        moved++;
        console.log(`  📄 Moved: ${file} → docs/${subdir}/`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          errors++;
          console.log(`  ❌ Error moving ${file}: ${err.message}`);
        }
      }
    }
  }
  
  console.log('\n\n✅ DOCUMENTATION ORGANIZED!\n');
  console.log(`📊 Statistics:`);
  console.log(`  Files moved: ${moved}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Directories created: ${Object.keys(DOCS_STRUCTURE).length}`);
  
  // Create index
  await createDocsIndex(docsDir);
}

async function createDocsIndex(docsDir) {
  const indexContent = `# 📚 Documentation Index

## Structure

### Forum Responses
Réponses aux utilisateurs du forum Homey Community
- Location: \`docs/forum-responses/\`

### Diagnostics
Rapports de diagnostic et résolution de problèmes
- Location: \`docs/diagnostics/\`

### Releases
Notes de version et rapports de session
- Location: \`docs/releases/\`

### Guides
Guides utilisateurs et développeurs
- Location: \`docs/guides/\`

### Project Status
État du projet et statuts de publication
- Location: \`docs/project-status/\`

### Audits
Audits de code et rapports de qualité
- Location: \`docs/audits/\`

### GitHub Issues
Résolution de problèmes GitHub
- Location: \`docs/github-issues/\`

---

**Last Updated**: ${new Date().toISOString()}
`;

  const indexPath = path.join(docsDir, 'INDEX.md');
  await fs.writeFile(indexPath, indexContent);
  console.log(`\n📄 Created: docs/INDEX.md`);
}

organizeDocumentation().catch(console.error);
