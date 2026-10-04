# HomeKit on Homey is being retired: use Homey's Matter Bridge

From Homey Pro / Self-Hosted Server **v13.5.1**, new users can no longer enable Homey's built-in
HomeKit experience, and Athom will remove it completely in **March 2027**. Athom recommends the
**Matter Bridge** app to expose Homey devices to Apple Home, Google Home and others.

What this means for this app:
- Devices paired with this app keep working in Homey; nothing changes in pairing or flows.
- To see them in Apple Home after the change, install Homey's Matter Bridge app and select the devices.
- We are checking every driver so that it uses a standard Homey device class and standard
  capabilities (on/off, dim, colour temperature, colour, window coverings, measurements, alarms,
  target temperature), which the bridge can map. Where a driver only exposed a custom capability,
  a standard one is added next to it; nothing is removed.

Status of the audit: see `data/leads/resume-checkpoint.json` (master_queue, "Matter Bridge").
