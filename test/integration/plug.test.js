#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const Homey = require('homey');
const Driver = require('../../drivers/plugs-TS011F/driver.js');

describe('Plug Driver', function() {
  let driver;
  
  before(function() {
    driver = new Driver();
  });
  
  describe('onInit', function() {
    it('should initialize without errors', async function() {
      await expect(driver.onInit()).to.not.be.rejected;
    });
  });
  
  describe('onPairListDevices', function() {
    it('should return device list', async function() {
      const devices = await driver.onPairListDevices();
      expect(devices).to.be.an('array');
      expect(devices[0]).to.have.property('name');
      expect(devices[0]).to.have.property('data');
    });
  });
  
  describe('Capabilities', function() {
    it('should support onoff capability', function() {
      expect(driver.getCapabilities()).to.include('onoff');
    });
    
    it('should support measure_power capability', function() {
      expect(driver.getCapabilities()).to.include('measure_power');
    });
  });
});
// end of test file
