const { expect } = require('chai');
const DimmableLightDriver = require('../../../drivers/tuya_light/dimmable_light/driver');

describe('DimmableLightDriver', () => {
  let driver;

  before(() => {
    driver = new DimmableLightDriver();
  });

  it('should initialize successfully', async () => {
    await driver.onInit();
    expect(driver).to.be.an.instanceOf(DimmableLightDriver);
  });
});
