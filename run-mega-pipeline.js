const { orchestrator } = require('./src/core/orchestrator.js');

async function runPipeline() {
  try {
    console.log('🚀 Lancement du pipeline MEGA...');
    await orchestrator.runPipeline();
    console.log('✅ Pipeline MEGA terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du pipeline:', error);
  }
}

runPipeline();
