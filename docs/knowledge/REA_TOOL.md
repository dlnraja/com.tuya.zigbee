# REA (morluto/rea): evaluation for this project

Author: morluto (MIT). Evaluated 2026-10-10. Docs only; the tool is not installed in CI.

- https://github.com/morluto/rea, MIT licence (© 2026 morluto). npm package `rea-agents`, set up with `npx rea-agents setup`.
- It is an MCP server plus a CLI that lets an agent inspect native binaries (via Hopper, Ghidra or IDA), JS/Electron apps, .NET, Android (jadx), websites and HAR/mitmproxy captures. It bundles binwalk and unblob, which are firmware unpackers.
- Its own disclaimer says it is for lawful research and that the user must get any required authorization.
- Fit for this project: low to medium. Fine for our own artefacts, e.g. inspecting the .tar.gz of our own build when Athom rejects it, or reading a HAR of the Homey web app's public developer API calls. Do NOT point it at Homey OS, the Zigbee NCP image or Athom binaries: that is proprietary code covered by Athom's terms. Tuya device OTA images (Zigbee OTA files) are third-party firmware too, so treat them the same way.
- Repo is new (0 stars, last commit 2026-10-10), so it is unproven. Run it only in the box, never on the user's PC with credentials.
