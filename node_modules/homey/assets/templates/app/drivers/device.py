from homey.device import Device


class MyDevice(Device):
    async def on_init(self):
        await super().on_init()
        self.log("Initialized MyDevice")


homey_export = MyDevice
