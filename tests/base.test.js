const { HomeyMock, DriverMock } = require('homey-mock');
const StandardDriver = require('../drivers/_template/standard_driver');

describe('Standard Driver Tests', () => {
  let homey;
  let driver;

  beforeEach(() => {
    homey = new HomeyMock();
    driver = new DriverMock(homey, StandardDriver);
  });

  test('should initialize successfully', async () => {
    await expect(driver.onNodeInit({ zclNode: {} }))
      .resolves.not.toThrow();
  });

  test('should handle initialization errors', async () => {
    const errorDriver = new DriverMock(homey, class extends StandardDriver {
      async onNodeInit() {
        throw new Error('Simulated error');
      }
    });
    
    await expect(errorDriver.onNodeInit({ zclNode: {} }))
      .rejects.toThrow('Simulated error');
  });
});
