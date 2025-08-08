const { ZigbeeDevice } = require("homey-meshdriver"); class LightsDevice extends ZigbeeDevice { async onMeshInit() { this.log("lights device initialized"); } } module.exports = LightsDevice;
