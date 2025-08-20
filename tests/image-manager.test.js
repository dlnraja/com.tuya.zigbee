/**
 * Tests for image-manager module
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Mock the module
const ImageManager = require('../lib/images/image-manager');

test('ImageManager - constructor', (t) => {
  const manager = new ImageManager();
  assert.ok(manager.imageSizes);
  assert.ok(manager.imageSizes.drivers);
  assert.ok(manager.imageSizes.app);
});

test('ImageManager - getDriverImageSizes', (t) => {
  const manager = new ImageManager();
  const sizes = manager.getDriverImageSizes();
  
  assert.strictEqual(sizes.small.width, 75);
  assert.strictEqual(sizes.small.height, 75);
  assert.strictEqual(sizes.large.width, 500);
  assert.strictEqual(sizes.large.height, 500);
  assert.strictEqual(sizes.xlarge.width, 1000);
  assert.strictEqual(sizes.xlarge.height, 1000);
});

test('ImageManager - getAppImageSizes', (t) => {
  const manager = new ImageManager();
  const sizes = manager.getAppImageSizes();
  
  assert.strictEqual(sizes.small.width, 250);
  assert.strictEqual(sizes.small.height, 175);
  assert.strictEqual(sizes.large.width, 500);
  assert.strictEqual(sizes.large.height, 350);
  assert.strictEqual(sizes.xlarge.width, 1000);
  assert.strictEqual(sizes.xlarge.height, 700);
});

test('ImageManager - generateImagePaths', (t) => {
  const manager = new ImageManager();
  const paths = manager.generateImagePaths('/test/path', 'test-driver');
  
  assert.ok(paths.small.includes('test-driver'));
  assert.ok(paths.large.includes('test-driver'));
  assert.ok(paths.xlarge.includes('test-driver'));
  assert.ok(paths.small.includes('small.png'));
});

test('ImageManager - getValidationSummary', (t) => {
  const manager = new ImageManager();
  const summary = manager.getValidationSummary('./drivers');
  
  assert.ok(typeof summary.total === 'object');
  assert.ok(typeof summary.total.valid === 'number');
  assert.ok(typeof summary.total.invalid === 'number');
  assert.ok(typeof summary.total.missing === 'number');
});

console.log('✅ ImageManager tests completed');
