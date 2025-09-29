const { expect } = require('chai');
const ContactSensorDriver = require('../../../drivers/tuya_sensor/contact_sensor/driver');

describe('ContactSensorDriver', () => {
  let driver;

  before(() => {
    driver = new ContactSensorDriver();
  });

  it('should initialize successfully', async () => {
    await driver.onInit();
    expect(driver).to.be.an.instanceOf(ContactSensorDriver);
  });
});
