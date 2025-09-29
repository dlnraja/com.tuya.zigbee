#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();

describe('App', () => {
  let app;
  let Homey;
  let homeyStub;

  beforeEach(() => {
    // Create stubs for Homey
    homeyStub = {
      app: {
        set: sinon.stub(),
        get: sinon.stub()
      },
      __: (key) => key // Simple i18n stub
    };

    // Mock the Homey module
    const App = proxyquire('../../app', {
      'homey': homeyStub
    });
    
    app = new App();
  });

  describe('onInit', () => {
    it('should initialize the application', async () => {
      // Mock the logger
      app.log = {
        info: sinon.stub(),
        error: sinon.stub()
      };

      await app.onInit();
      
      expect(app.log.info.calledWith('Initializing Tuya Zigbee app')).to.be.true;
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Test error');
      app.log = {
        info: sinon.stub(),
        error: sinon.stub()
      };
      
      // Force an error during initialization
      app.initError = () => { throw error; };
      
      await app.onInit();
      
      expect(app.log.error.calledWith('Error initializing app', error)).to.be.true;
    });
  });

  describe('onUninit', () => {
    it('should clean up resources', async () => {
      app.log = {
        info: sinon.stub()
      };
      
      await app.onUninit();
      
      expect(app.log.info.calledWith('Tuya Zigbee app uninitialized')).to.be.true;
    });
  });
});
