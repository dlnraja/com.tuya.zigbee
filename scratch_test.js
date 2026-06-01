try {
  const Device = require('./drivers/remote_button_wireless/device');
  console.log("Success! Device is:", typeof Device);
} catch (e) {
  console.error("Error:", e.message);
  console.error(e.stack);
}
