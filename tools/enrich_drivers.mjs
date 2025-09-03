import { createLogger } from '../lib/logger.js';
import { getDeviceInfoFromText, getDeviceInfoFromImage } from '../lib/llmarenaHelpers.js';

const logger = createLogger('enrich_drivers');

/**
 * Enriches driver metadata using NLP and image recognition.
 * @param {string} driverPath - Path to driver directory
 * @param {Object} options - Enrichment options
 */
export default async function enrichDriver(driverPath, options = {}) {
  logger.info(`Starting enrichment for driver: ${driverPath}`);
  
  try {
    // Step 1: Extract text sources from driver metadata
    const textSources = await extractTextSources(driverPath);
    
    // Step 2: Process text with NLP
    const nlpResults = await getDeviceInfoFromText(textSources.join('\n'));
    
    // Step 3: Extract and process images
    const imagePaths = await extractImagePaths(driverPath);
    const visionResults = await Promise.all(
      imagePaths.map(img => getDeviceInfoFromImage(img))
    );
    
    // Step 4: Merge results and update metadata
    const mergedData = mergeEnrichmentResults(nlpResults, visionResults);
    await updateDriverMetadata(driverPath, mergedData);
    
    logger.success(`Successfully enriched driver: ${driverPath}`);
  } catch (error) {
    logger.error(`Enrichment failed for ${driverPath}:`, error);
  }
}

// Helper functions would be implemented below
