// Test script
const B = require('../../lib/SDK3CompatBridge');
async function main() {
  console.log('SDK3CompatBridge v' + B.version);
  console.log('Limitations:', B.limitationsCount);
  console.log('Error codes:', B.errorCodesCount);
  console.log('');
  const bridge = new B.SDK3CompatBridge({
    hasCapability: () => true,
    getCapabilityValue: () => null,
    isDestroyed: false,
    getStoreValue: () => null,
    setStoreValue: () => {},
  });
  console.log('Test: isDestroyed() =', bridge.isDestroyed());
  console.log('Test: setCapabilitySafe =', await bridge.setCapabilitySafe('test_cap', 42));
  console.log('Test: getStoreValueSafe =', await bridge.getStoreValueSafe('missing', 'default'));
  console.log('Test: isRetriableError(0x80) =', bridge.isRetriableError(0x80));
  console.log('Test: describeError(0x80) =', bridge.describeError(0x80));
  console.log('Test: getStats =', JSON.stringify(bridge.getStats()));
  console.log('Test: report =', JSON.stringify(bridge.getDiagnosticReport().stats));
}
main();
