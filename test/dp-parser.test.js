'use strict';

/**
 * Tests for dp-parser-enhanced.js
 */

const { expect } = require('chai');
const { parseTuyaDp, convertToBuffer, mapDpToCapability, encodeDpValue } = require('../lib/tuya/dp-parser-enhanced');

describe('dp-parser-enhanced', () => {
  
  describe('convertToBuffer', () => {
    
    it('should handle Buffer input', () => {
      const input = Buffer.from([0x01, 0x01, 0x00, 0x01, 0x01]);
      const result = convertToBuffer(input);
      expect(result).to.be.instanceof(Buffer);
      expect(result.equals(input)).to.be.true;
    });
    
    it('should handle base64 string', () => {
      const input = 'AQEAAQE='; // [0x01, 0x01, 0x00, 0x01, 0x01] in base64
      const result = convertToBuffer(input);
      expect(result).to.be.instanceof(Buffer);
      expect(result).to.have.lengthOf(5);
    });
    
    it('should handle JSON string', () => {
      const input = '[1, 1, 0, 1, 1]';
      const result = convertToBuffer(input);
      expect(result).to.be.instanceof(Buffer);
    });
    
    it('should handle hex string', () => {
      const input = '0101000101';
      const result = convertToBuffer(input);
      expect(result).to.be.instanceof(Buffer);
      expect(result).to.have.lengthOf(5);
    });
    
    it('should handle array of bytes', () => {
      const input = [0x01, 0x01, 0x00, 0x01, 0x01];
      const result = convertToBuffer(input);
      expect(result).to.be.instanceof(Buffer);
      expect(result).to.have.lengthOf(5);
    });
    
    it('should return null for invalid input', () => {
      const result = convertToBuffer(null);
      expect(result).to.be.null;
    });
    
  });
  
  describe('parseTuyaDp', () => {
    
    it('should parse boolean DP (type 0x01)', () => {
      // DP 1, type 0x01 (bool), length 1, value 0x01 (true)
      const buffer = Buffer.from([0x01, 0x01, 0x00, 0x01, 0x01]);
      const dps = parseTuyaDp(buffer);
      
      expect(dps).to.be.an('array');
      expect(dps).to.have.lengthOf(1);
      expect(dps[0]).to.deep.include({
        dpId: 1,
        dpType: 1,
        value: true
      });
    });
    
    it('should parse value DP (type 0x02)', () => {
      // DP 15, type 0x02 (value), length 4, value 0x00000064 (100)
      const buffer = Buffer.from([0x0F, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, 0x64]);
      const dps = parseTuyaDp(buffer);
      
      expect(dps).to.be.an('array');
      expect(dps).to.have.lengthOf(1);
      expect(dps[0]).to.deep.include({
        dpId: 15,
        dpType: 2,
        value: 100
      });
    });
    
    it('should parse string DP (type 0x03)', () => {
      // DP 3, type 0x03 (string), length 5, value "hello"
      const buffer = Buffer.from([0x03, 0x03, 0x00, 0x05, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
      const dps = parseTuyaDp(buffer);
      
      expect(dps).to.be.an('array');
      expect(dps).to.have.lengthOf(1);
      expect(dps[0]).to.deep.include({
        dpId: 3,
        dpType: 3,
        value: 'hello'
      });
    });
    
    it('should parse multiple DPs', () => {
      // DP 1 (bool true) + DP 2 (bool false)
      const buffer = Buffer.from([
        0x01, 0x01, 0x00, 0x01, 0x01, // DP 1
        0x02, 0x01, 0x00, 0x01, 0x00  // DP 2
      ]);
      const dps = parseTuyaDp(buffer);
      
      expect(dps).to.be.an('array');
      expect(dps).to.have.lengthOf(2);
      expect(dps[0].dpId).to.equal(1);
      expect(dps[0].value).to.equal(true);
      expect(dps[1].dpId).to.equal(2);
      expect(dps[1].value).to.equal(false);
    });
    
    it('should handle malformed data gracefully', () => {
      const buffer = Buffer.from([0x01]); // Too short
      const dps = parseTuyaDp(buffer);
      
      expect(dps).to.be.an('array');
      expect(dps).to.have.lengthOf(0);
    });
    
  });
  
  describe('mapDpToCapability', () => {
    
    it('should map DP 1 to onoff for single gang', () => {
      const mapping = mapDpToCapability(1, true, { gangCount: 1 });
      expect(mapping).to.deep.equal({
        capability: 'onoff',
        value: true
      });
    });
    
    it('should map DP 1 to onoff for multi gang', () => {
      const mapping = mapDpToCapability(1, true, { gangCount: 2 });
      expect(mapping).to.deep.equal({
        capability: 'onoff',
        value: true
      });
    });
    
    it('should map DP 2 to onoff.gang2 for 2-gang', () => {
      const mapping = mapDpToCapability(2, false, { gangCount: 2 });
      expect(mapping).to.deep.equal({
        capability: 'onoff.gang2',
        value: false
      });
    });
    
    it('should map DP 3 to onoff.gang3 for 4-gang', () => {
      const mapping = mapDpToCapability(3, true, { gangCount: 4 });
      expect(mapping).to.deep.equal({
        capability: 'onoff.gang3',
        value: true
      });
    });
    
    it('should map DP 15 to measure_battery', () => {
      const mapping = mapDpToCapability(15, 85, { gangCount: 1 });
      expect(mapping).to.deep.equal({
        capability: 'measure_battery',
        value: 85
      });
    });
    
    it('should map DP 18 to measure_temperature with division', () => {
      const mapping = mapDpToCapability(18, 235, { gangCount: 1 });
      expect(mapping).to.deep.equal({
        capability: 'measure_temperature',
        value: 23.5
      });
    });
    
    it('should map DP 19 to measure_humidity with division', () => {
      const mapping = mapDpToCapability(19, 650, { gangCount: 1 });
      expect(mapping).to.deep.equal({
        capability: 'measure_humidity',
        value: 65
      });
    });
    
    it('should return null for unmapped DP', () => {
      const mapping = mapDpToCapability(99, 123, { gangCount: 1 });
      expect(mapping).to.be.null;
    });
    
  });
  
  describe('encodeDpValue', () => {
    
    it('should encode boolean DP', () => {
      const frame = encodeDpValue(1, 0x01, true);
      
      expect(frame).to.be.instanceof(Buffer);
      expect(frame).to.have.lengthOf(5); // dpId(1) + dpType(1) + dpLen(2) + data(1)
      expect(frame[0]).to.equal(1); // dpId
      expect(frame[1]).to.equal(0x01); // dpType
      expect(frame[2]).to.equal(0x00); // dpLen high
      expect(frame[3]).to.equal(0x01); // dpLen low
      expect(frame[4]).to.equal(0x01); // value true
    });
    
    it('should encode value DP', () => {
      const frame = encodeDpValue(15, 0x02, 100);
      
      expect(frame).to.be.instanceof(Buffer);
      expect(frame).to.have.lengthOf(8); // dpId(1) + dpType(1) + dpLen(2) + data(4)
      expect(frame[0]).to.equal(15); // dpId
      expect(frame[1]).to.equal(0x02); // dpType
      expect(frame.readUInt32BE(4)).to.equal(100); // value
    });
    
    it('should encode string DP', () => {
      const frame = encodeDpValue(3, 0x03, 'test');
      
      expect(frame).to.be.instanceof(Buffer);
      expect(frame).to.have.lengthOf(8); // dpId(1) + dpType(1) + dpLen(2) + data(4)
      expect(frame[0]).to.equal(3); // dpId
      expect(frame[1]).to.equal(0x03); // dpType
      expect(frame.toString('utf8', 4, 8)).to.equal('test'); // value
    });
    
  });
  
});
