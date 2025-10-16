const { batteryConverter } = require('../../lib/tuya-engine/converters/battery');

describe('Battery Converter', () => {
  describe('fromDP', () => {
    test('converts 100% to 1', () => {
      expect(batteryConverter.fromDP(100)).toBe(1);
    });
    
    test('converts 50% to 0.5', () => {
      expect(batteryConverter.fromDP(50)).toBe(0.5);
    });
    
    test('converts 0% to 0', () => {
      expect(batteryConverter.fromDP(0)).toBe(0);
    });
    
    test('handles invalid input', () => {
      expect(batteryConverter.fromDP(null)).toBe(0);
      expect(batteryConverter.fromDP(undefined)).toBe(0);
      expect(batteryConverter.fromDP('invalid')).toBe(0);
    });
    
    test('clamps values above 100', () => {
      expect(batteryConverter.fromDP(150)).toBe(1);
    });
    
    test('clamps values below 0', () => {
      expect(batteryConverter.fromDP(-10)).toBe(0);
    });
  });
  
  describe('toDP', () => {
    test('converts 1 to 100%', () => {
      expect(batteryConverter.toDP(1)).toBe(100);
    });
    
    test('converts 0.5 to 50%', () => {
      expect(batteryConverter.toDP(0.5)).toBe(50);
    });
    
    test('converts 0 to 0%', () => {
      expect(batteryConverter.toDP(0)).toBe(0);
    });
    
    test('rounds to integer', () => {
      expect(batteryConverter.toDP(0.755)).toBe(76);
    });
  });
});
