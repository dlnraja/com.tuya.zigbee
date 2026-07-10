const { expect } = require('chai');
const AdvancedAnalytics = require('../../lib/analytics/AdvancedAnalytics');

describe('AdvancedAnalytics Syntax & Initialization', () => {
    it('should be requirable without syntax errors', () => {
        expect(AdvancedAnalytics).to.be.a('function');
    });

    it('should calculate uptime without crashing', () => {
        // Mock Homey
        const mockHomey = {
            log: () => {},
            error: () => {},
            insights: {
                createLog: async () => {},
                getLog: async () => {}
            }
        };
        
        const analytics = new AdvancedAnalytics(mockHomey);
        const result = analytics.calculateUptime('test-device');
        expect(result).to.be.a('number');
        expect(result).to.be.at.least(0);
        expect(result).to.be.at.most(100);
    });
});
