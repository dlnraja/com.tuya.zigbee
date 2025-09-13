
/**
 * NLP-Enhanced Device Recognition Algorithm
 * Uses natural language processing for better device identification
 */

class NLPDeviceRecognition {
    constructor() {
        this.devicePatterns = {
            sensors: ['sensor', 'detector', 'monitor', 'gauge'],
            lighting: ['light', 'lamp', 'bulb', 'strip', 'spot'],
            switches: ['switch', 'plug', 'outlet', 'socket'],
            covers: ['curtain', 'blind', 'shade', 'shutter'],
            climate: ['thermostat', 'valve', 'heater', 'cooler']
        };
        
        this.manufacturerPatterns = {
            tuya: ['_TZ3000_', '_TZE200_', '_TYZB01_', 'TUYATEC'],
            xiaomi: ['lumi.', 'XIAOMI'],
            ikea: ['IKEA', 'TRADFRI'],
            philips: ['Philips', 'HUE']
        };
    }
    
    analyzeDeviceName(deviceName, modelId) {
        const analysis = {
            category: this.categorizeDevice(deviceName, modelId),
            manufacturer: this.identifyManufacturer(deviceName),
            confidence: 0,
            suggestions: []
        };
        
        // Calculate confidence based on pattern matching
        analysis.confidence = this.calculateConfidence(deviceName, modelId, analysis);
        
        // Generate suggestions for improvement
        analysis.suggestions = this.generateSuggestions(analysis);
        
        return analysis;
    }
    
    categorizeDevice(deviceName, modelId) {
        const name = deviceName.toLowerCase();
        
        for (const [category, patterns] of Object.entries(this.devicePatterns)) {
            for (const pattern of patterns) {
                if (name.includes(pattern)) {
                    return category;
                }
            }
        }
        
        // Fallback to model ID analysis
        return this.categorizeByModelId(modelId);
    }
    
    calculateConfidence(deviceName, modelId, analysis) {
        let score = 0;
        
        // High confidence if manufacturer is clearly identified
        if (analysis.manufacturer !== 'unknown') score += 0.4;
        
        // Medium confidence if category is identified
        if (analysis.category !== 'unknown') score += 0.3;
        
        // Additional points for model ID patterns
        if (modelId && modelId.match(/^TSd{4}[A-Z]?$/)) score += 0.2;
        
        // Pattern recognition bonus
        if (deviceName.includes('_TZ3000_')) score += 0.1;
        
        return Math.min(score, 1.0);
    }
}

module.exports = NLPDeviceRecognition;
