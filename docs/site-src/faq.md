# FAQ

Recurring problems and what to do about them. Something not listed?
[Open a GitHub issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new/choose) with the details
from the [device request guide](request-device.html).

## Pairing

### My device pairs as "unknown", "Generic Zigbee device" or with the wrong class (for example a TRV that shows up as a socket)

Homey picks a driver from the exact couple *manufacturer name + model*. When that couple is not in
any driver, Homey falls back to its generic driver, or another app grabs it.
- Check the [supported devices list](devices.html) for your manufacturer name.
- If it is listed, update the app (try the **Test** channel), remove the device and pair it again
  close to Homey. A driver is chosen at pairing time only.
- If it is not listed, [request it](request-device.html).

### It is listed, but still pairs wrong

Some manufacturer names are shared by several products (for example a 2-button and a 4-button
remote). The model id decides; send us both values and the interview so we can place it in the
right driver.

### Pairing times out

Sleepy battery devices stop answering after a few seconds. Keep the device awake (short presses on
its button every few seconds) during pairing and the interview, and pair it close to Homey or a
mains-powered router.

## Buttons and remotes

### A button press does nothing in Flows

- Make sure you use the trigger card of *this* device ("button pressed", with the button number and
  press type).
- Remotes can send the same press on several paths (on/off command, scene command, Tuya data point).
  The app merges them so one press fires one Flow; if *none* arrives, send a diagnostic report right
  after pressing.
- Some remotes need to be bound to Homey; re-pairing redoes the binding.

### Scene mode vs dimmer mode

Many Tuya remotes (TS004F family) have two modes: *dimmer/command* mode sends on/off and level
commands, *scene/event* mode sends button events (single, double, long). The app detects the mode
from what the remote sends. To switch, most models use a long press on a button combination (see
the device manual). Scene mode is the one that gives per-button Flow triggers.

### Double, triple or long press missing

Only presses the hardware really sends are offered as native triggers. When a device never sends
double or long presses, the app can emulate them in software; the device page shows what was
detected.

## Sleepy devices, time and battery

### The clock on my sensor or thermostat is wrong

Tuya devices ask the coordinator for the time. The app answers these requests and can push the time
again when the device wakes up. Battery devices only accept it while awake, so the clock can take
until the next wake-up (or a button press) to be right.

### Settings I change on a battery device are not applied

Writes to a sleepy device are queued and sent when it next wakes up. Press its button to apply them
sooner.

### Battery shows 0 %, 100 % or nothing

Battery level is computed from what the device reports (percentage or voltage) with a curve per
battery chemistry. Until the first report, the value stays empty instead of showing a made-up
number. Some devices only send a "battery low" alarm; then you get an alarm, not a percentage.

## Wi-Fi (local) devices

### Which Tuya local protocol versions are supported?

The Wi-Fi drivers talk to Tuya devices on your LAN with protocol versions 3.1 to 3.5 (including the
3.22 variant). The version is auto-detected; you can force it in the device settings when
detection fails. Tuya cloud credentials are only needed once to read the local key.

### A power strip shows only one socket / a cover exposes only one data point

Some devices answer only for the first data point until asked about the others. Recent versions probe the
extra data points and creates the missing sockets, and recognises a single-DP cover from its values.
If yours still shows one entry, send a diagnostic report.

### "socket hang up" errors

This message means the other side closed a network connection. In the app it came from cloud reads
on reused HTTPS connections; those reads are now retried a few times (commands are never retried, so
nothing is sent twice). The same words in a *build* status at Athom are a server-side processing
failure on their side, handled by our publish retry policy; nothing to do for users.

## Flow cards

### A Flow card disappeared or shows "unknown card"

Cards are sometimes renamed or merged when a driver is fixed. Open the Flow, pick the card again from
the device and save. The app no longer crashes on an unknown card.

## Firmware updates (OTA)

### Can the app update my device firmware?

On Homey firmware 13.2.0 or newer, **Homey itself** is the Zigbee OTA server: it serves the images
that a driver declares, and you start the update yourself in the Homey app. The app only declares
images and reads the version and progress the device reports; it never starts an update on its own.

## Channels and versions

### Test or Live?

Every version goes to the **Test** channel first. Install the test version from the links in the
[home page](index.html#install) to get fixes days earlier; Live gets the same version after it has
been checked. Report Test problems in a GitHub issue with the version number.

### Which app should I use?

See the [three apps](index.html#the-three-apps). Do not install two of them for the same device.

## Still stuck?

Send a diagnostic report from the app and open a
[GitHub issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new/choose) with the code, your
manufacturer name and model.
