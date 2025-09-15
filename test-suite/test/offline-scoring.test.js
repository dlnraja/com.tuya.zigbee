#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { describe, it } = require('mocha');
const path = require('path');

// Load the module to test
const { OfflineReliabilityScoring } = require(path.join('..', 'tools', 'offline-reliability-scoring'));

describe('OfflineReliabilityScoring', function() {
  // Test with default thresholds
  describe('with default thresholds', function() {
    const defaultThresholds = {
      propose: 0.7,
      confirm: 0.9
    };

    it('should initialize with empty sources', function() {
      const scorer = new OfflineReliabilityScoring([], defaultThresholds);
      assert.strictEqual(scorer.sources.length, 0);
    });

    it('should calculate score for single source below propose threshold', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: 0.6, weight: 1 }
      ], defaultThresholds);
      
      const result = scorer.computeScore();
      assert.strictEqual(result.verdict, 'unreliable');
      assert.ok(result.overall < defaultThresholds.propose);
    });

    it('should calculate score for single source above propose threshold', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: 0.8, weight: 1 }
      ], defaultThresholds);
      
      const result = scorer.computeScore();
      assert.strictEqual(result.verdict, 'proposed');
      assert.ok(result.overall >= defaultThresholds.propose);
      assert.ok(result.overall < defaultThresholds.confirm);
    });

    it('should calculate score for single source above confirm threshold', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: 0.95, weight: 1 }
      ], defaultThresholds);
      
      const result = scorer.computeScore();
      assert.strictEqual(result.verdict, 'confirmed');
      assert.ok(result.overall >= defaultThresholds.confirm);
    });
  });

  // Test with custom thresholds
  describe('with custom thresholds', function() {
    const customThresholds = {
      propose: 0.5,
      confirm: 0.7
    };

    it('should respect custom propose threshold', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: 0.6, weight: 1 }
      ], customThresholds);
      
      const result = scorer.computeScore();
      assert.strictEqual(result.verdict, 'proposed');
    });
  });

  // Test with multiple sources
  describe('with multiple sources', function() {
    const defaultThresholds = {
      propose: 0.7,
      confirm: 0.9
    };

    it('should weight multiple sources correctly', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: 0.8, weight: 1 },
        { reliability: 0.9, weight: 2 }
      ], defaultThresholds);
      
      const result = scorer.computeScore();
      // Expected: (0.8*1 + 0.9*2) / (1+2) = 0.866...
      assert.ok(result.overall > 0.85 && result.overall < 0.88);
      assert.strictEqual(result.verdict, 'proposed');
    });

    it('should handle empty source list', function() {
      const scorer = new OfflineReliabilityScoring([], defaultThresholds);
      const result = scorer.computeScore();
      assert.strictEqual(result.overall, 0);
      assert.strictEqual(result.verdict, 'unreliable');
    });
  });

  // Test edge cases
  describe('edge cases', function() {
    it('should handle zero weights', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: 0.8, weight: 0 },
        { reliability: 0.9, weight: 0 }
      ]);
      
      const result = scorer.computeScore();
      assert.strictEqual(result.overall, 0);
    });

    it('should handle negative reliability values', function() {
      const scorer = new OfflineReliabilityScoring([
        { reliability: -0.5, weight: 1 }
      ]);
      
      const result = scorer.computeScore();
      assert.strictEqual(result.overall, 0);
    });
  });
});
