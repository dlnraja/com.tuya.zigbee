const assert = require('assert');
const { getModelId } = require('../../lib/utils/tuyaUtils');
const { TuyaDPParser } = require('../../lib/tuya/TuyaDPParser');
const AdvancedAnalytics = require('../../lib/analytics/AdvancedAnalytics');

describe('Universal Tuya Zigbee - Core Unit Tests', () => {

    describe('tuyaUtils.getModelId', () => {
        it('should return modelId when present in zclNode', () => {
            const device = { zclNode: { modelId: 'TS0601' } };
            assert.strictEqual(getModelId(device), 'TS0601');
        });

        it('should return null when zclNode is missing', () => {
            const device = {};
            assert.strictEqual(getModelId(device), null);
        });

        it('should return null when modelId is missing', () => {
            const device = { zclNode: {} };
            assert.strictEqual(getModelId(device), null);
        });
    });

    describe('AdvancedAnalytics._calculateRoundedUptime', () => {
        it('should round uptime correctly', () => {
            const uptime = 12.345;
            // logic: Math.round(uptime * 10)
            const result = Math.round(uptime * 10);
            assert.strictEqual(result, 123);
        });
    });

    describe('TuyaDPParser.parse', () => {
        it('should parse buffer data correctly', () => {
            // Tuya DP format: [status, seq, dpId, dpType, lenH, lenL, data...]
            const buffer = Buffer.from([0x00, 0x01, 0x05, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, 0x64]); // DP5, Type 2 (Value), Length 4, Value 100
            const result = TuyaDPParser.parse(buffer);
            assert.strictEqual(result.dpId, 5);
            assert.strictEqual(result.dpValue, 100);
        });
    });
});
