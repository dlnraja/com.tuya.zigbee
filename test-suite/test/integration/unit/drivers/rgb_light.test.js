const { expect } = require('chai');
const RGBLightDriver = require('../../../drivers/tuya_light/rgb_light/driver');

describe('RGBLightDriver', () => {
  let driver;

  before(() => {
    driver = new RGBLightDriver();
  });

  it('should initialize successfully', async () => {
    await driver.onInit();
    expect(driver).to.be.an.instanceOf(RGBLightDriver);
  });
});
