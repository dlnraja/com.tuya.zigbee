# Tests

Tests unitaires et d'intégration pour Universal Tuya Zigbee.

## Structure

```
test/
├── unit/           # Tests unitaires
├── integration/    # Tests d'intégration
└── mocks/          # Mock devices
```

## Running Tests

```bash
# Install test dependencies
npm install --save-dev mocha chai

# Run all tests
npm test

# Run specific test
npm test -- --grep "ZigbeeHelper"
```

## Example Test

```javascript
const { expect } = require('chai');
const ZigbeeHelper = require('../lib/ZigbeeHelper');

describe('ZigbeeHelper', () => {
  it('should parse battery percentage correctly', () => {
    expect(ZigbeeHelper.parseBatteryPercentage(200)).to.equal(100);
    expect(ZigbeeHelper.parseBatteryPercentage(100)).to.equal(50);
    expect(ZigbeeHelper.parseBatteryPercentage(0)).to.equal(0);
  });
});
```

## Coverage

Cible: 80%+ code coverage sur lib/ et drivers/
