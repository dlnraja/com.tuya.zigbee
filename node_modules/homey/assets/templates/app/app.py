from homey.app import App


class MyApp(App):
    async def on_init(self):
        await super().on_init()
        self.log("Initialized MyApp")


homey_export = MyApp
