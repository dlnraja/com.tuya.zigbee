/**
 * Device Extraction Tool
 * Processes raw data from crawlers to extract normalized device candidates
 */

const fs = require('fs');
const path = require('path');

class DeviceExtractor {
  constructor() {
    this.researchDir = path.join(__dirname, '../research');
    this.outputFile = path.join(this.researchDir, 'device_candidates.json');
  }

  async initialize() {
    if (!fs.existsSync(this.researchDir)) {
      fs.mkdirSync(this.researchDir, { recursive: true });
    }
    console.log('🔍 Device Extractor initialisé');
  }

  async extractAll() {
    console.log('🚀 Démarrage de l\'extraction des devices...');
    
    const candidates = [];
    
    // Extraire depuis les données du forum
    const forumData = await this.loadForumData();
    const forumCandidates = this.extractFromForum(forumData);
    candidates.push(...forumCandidates);
    
    // Extraire depuis les données GitHub
    const githubData = await this.loadGitHubData();
    const githubCandidates = this.extractFromGitHub(githubData);
    candidates.push(...githubCandidates);
    
    // Normaliser et dédupliquer
    const normalizedCandidates = this.normalizeCandidates(candidates);
    
    await this.writeOutput(normalizedCandidates);
    console.log(`✅ Extraction terminée: ${normalizedCandidates.length} candidats uniques`);
    
    return normalizedCandidates;
  }

  async loadForumData() {
    const forumFile = path.join(this.researchDir, 'forum_for_tuya_zigbee.jsonl');
    if (!fs.existsSync(forumFile)) {
      console.log('⚠️ Fichier forum non trouvé, utilisation de données mock');
      return this.generateMockForumData();
    }
    
    const content = await fs.promises.readFile(forumFile, 'utf8');
    return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  }

  async loadGitHubData() {
    const githubFiles = [
      'github_upstream_issues.jsonl',
      'github_upstream_prs.jsonl',
      'github_origin_issues.jsonl',
      'github_origin_prs.jsonl'
    ];
    
    const allData = [];
    
    for (const file of githubFiles) {
      const filePath = path.join(this.researchDir, file);
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        allData.push(...lines.map(line => JSON.parse(line)));
      }
    }
    
    if (allData.length === 0) {
      console.log('⚠️ Aucun fichier GitHub trouvé, utilisation de données mock');
      return this.generateMockGitHubData();
    }
    
    return allData;
  }

  generateMockForumData() {
    return [
      {
        source: 'tuya-zigbee-app',
        raw_text: 'Device pairing success: _TZ3000_abc123, manufacturer: Tuya, model: TS0601_switch',
        detected_entities: [
          { type: 'device_id', value: '_TZ3000_abc123', category: 'tuya_zigbee' },
          { type: 'manufacturer', value: 'Tuya', category: 'brand' },
          { type: 'model', value: 'TS0601_switch', category: 'product' }
        ]
      }
    ];
  }

  generateMockGitHubData() {
    return [
      {
        repo: 'JohanBendz/com.tuya.zigbee',
        title: 'Add support for _TZE200_xyz789 device',
        body: 'This PR adds support for the new _TZE200_xyz789 device with proper endpoint mapping.',
        detected_entities: [
          { type: 'device_id', value: '_TZE200_xyz789', category: 'tuya_zigbee' }
        ]
      }
    ];
  }

  extractFromForum(forumData) {
    const candidates = [];
    
    for (const post of forumData) {
      if (post.detected_entities) {
        const candidate = this.buildCandidateFromEntities(post.detected_entities, 'forum', post);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }
    
    return candidates;
  }

  extractFromGitHub(githubData) {
    const candidates = [];
    
    for (const item of githubData) {
      if (item.detected_entities) {
        const candidate = this.buildCandidateFromEntities(item.detected_entities, 'github', item);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }
    
    return candidates;
  }

  buildCandidateFromEntities(entities, source, originalData) {
    const deviceId = entities.find(e => e.type === 'device_id')?.value;
    const manufacturer = entities.find(e => e.type === 'manufacturer')?.value;
    const model = entities.find(e => e.type === 'model')?.value;
    
    if (!deviceId) return null;
    
    return {
      device_id: deviceId,
      manufacturer: manufacturer || 'Tuya',
      model: model || this.extractModelFromDeviceId(deviceId),
      source: source,
      source_data: {
        type: originalData.title ? 'issue' : 'forum_post',
        id: originalData.issue_number || originalData.post_id || 'unknown',
        url: originalData.url || originalData.topic || 'unknown'
      },
      extracted_at: new Date().toISOString(),
      confidence: this.calculateConfidence(entities),
      capabilities: this.extractCapabilities(entities),
      technical_details: this.extractTechnicalDetails(entities)
    };
  }

  extractModelFromDeviceId(deviceId) {
    // Extraction du modèle depuis l'ID device
    if (deviceId.includes('_TZ3000_')) return 'TS0601';
    if (deviceId.includes('_TZE200_')) return 'TS0601';
    if (deviceId.includes('_TYZB')) return 'TS0601';
    return 'Unknown';
  }

  calculateConfidence(entities) {
    const requiredTypes = ['device_id'];
    const foundTypes = entities.map(e => e.type);
    const missingTypes = requiredTypes.filter(type => !foundTypes.includes(type));
    
    if (missingTypes.length === 0) return 'high';
    if (missingTypes.length === 1) return 'medium';
    return 'low';
  }

  extractCapabilities(entities) {
    const capabilities = [];
    
    // Analyser le texte pour détecter les capacités
    const allText = entities.map(e => e.value).join(' ').toLowerCase();
    
    if (allText.includes('switch') || allText.includes('on/off')) capabilities.push('onoff');
    if (allText.includes('dimmer') || allText.includes('brightness')) capabilities.push('dim');
    if (allText.includes('trv') || allText.includes('thermostat')) capabilities.push('target_temperature');
    if (allText.includes('plug') || allText.includes('power')) capabilities.push('measure_power');
    if (allText.includes('sensor') || allText.includes('temperature')) capabilities.push('measure_temperature');
    
    return capabilities;
  }

  extractTechnicalDetails(entities) {
    const details = {};
    
    const clusters = entities.find(e => e.type === 'clusters')?.value;
    if (clusters) details.clusters = clusters;
    
    const endpoints = entities.find(e => e.type === 'endpoints')?.value;
    if (endpoints) details.endpoints = endpoints;
    
    return details;
  }

  normalizeCandidates(candidates) {
    // Dédupliquer par device_id
    const uniqueMap = new Map();
    
    for (const candidate of candidates) {
      const key = candidate.device_id;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, candidate);
      } else {
        // Fusionner les informations
        const existing = uniqueMap.get(key);
        existing.sources = existing.sources || [existing.source];
        existing.sources.push(candidate.source);
        existing.capabilities = [...new Set([...existing.capabilities, ...candidate.capabilities])];
      }
    }
    
    return Array.from(uniqueMap.values());
  }

  async writeOutput(candidates) {
    const output = {
      extracted_at: new Date().toISOString(),
      total_candidates: candidates.length,
      candidates: candidates
    };
    
    await fs.promises.writeFile(this.outputFile, JSON.stringify(output, null, 2));
    console.log(`💾 Candidats sauvegardés: ${this.outputFile}`);
  }
}

// Auto-exécution si appelé directement
if (require.main === module) {
  const extractor = new DeviceExtractor();
  extractor.initialize()
    .then(() => extractor.extractAll())
    .then(() => console.log('✅ Extraction des devices terminée'))
    .catch(console.error);
}

module.exports = DeviceExtractor;


