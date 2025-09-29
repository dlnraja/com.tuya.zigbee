const { expect } = require('chai');
const MultiSensorDriver = require('../../../drivers/tuya_sensor/multi_sensor/driver');

describe('MultiSensorDriver', () => {
  let driver;

  before(() => {
    driver = new MultiSensorDriver();
  });

  it('should initialize successfully', async () => {
    await driver.onInit();
    expect(driver).to.be.an.instanceOf(MultiSensorDriver);
  });
});
