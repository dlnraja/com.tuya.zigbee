from homey.driver import Driver, ListDeviceProperties


class MyDriver(Driver):
    async def on_init(self):
        await super().on_init()
        self.log("Initialized MyDriver")

    async def on_pair_list_devices(self, view_data):
        device: ListDeviceProperties = {
            "store": {
                "address": "127.0.0.1",
            },
            "name": "My Device",
            "data": {"id": "my-device"},
        }
        return [device]


homey_export = MyDriver
