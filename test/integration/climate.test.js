#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const Homey = require('homey');
const Driver = require('../../../drivers/climates-TS0601_ac/driver.js');

describe('Climate Driver', function() {
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
    it('should support target_temperature capability', function() {
      expect(driver.getCapabilities()).to.include('target_temperature');
    });
  });
});
