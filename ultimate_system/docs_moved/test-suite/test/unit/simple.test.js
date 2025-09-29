#!/usr/bin/env node
'use strict';

const { expect } = require('chai');

describe('Simple Test', () => {
  it('should pass a simple test', () => {
    expect(true).to.be.true;
  });

  it('should add numbers correctly', () => {
    expect(1 + 1).to.equal(2);
  });
});
