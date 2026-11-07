# App diagnostic routing (7 Nov 2026)

Source of the confirmation: the maintainer, 7 Nov 2026, about 18:18 Europe/Paris.
The in-app action **Créer un rapport de diagnostic** (English label in our settings copy: **Send diagnostic report**) delivers to the maintainer's own Homey developer account.
One such report was created that evening from the shared house by our authorized browser session. That single send is the one that was authorized. It is not a standing permission to send more reports, and it is not a Homey system diagnostic to Athom support.

## Proof of destination

The receipt is the Homey developer notification. Its visible text is:

- subject line: the app has received a diagnostics report
- app id: `com.dlnraja.tuya.zigbee.bastien`
- app version: `v1.0.229`
- Homey: Pro (Early 2023), firmware `v13.5.3`
- "this log has been manually submitted by a user"
- "You can reply to this e-mail to get in touch with the user"
- the footer points at Homey Developer Tools, the crashes page for this app, build 237

The maintainer confirmed the Gmail receipt clock as 18:18:43 Europe/Paris. No mail identifier is stored here. A later screenshot of the Homey screen is not in the repo yet.

Our settings page tells the same gesture: Homey, Apps, this app, the three-dot menu, Send diagnostic report (`settings/index.html`). The app does not post that report itself.

## What is not this route

| Route | Who starts it | Where it goes |
|---|---|---|
| App diagnostic (this note) | A person, from this app's Homey menu | The developer account for that app id |
| Homey system diagnostic | A person, from Homey's own support / system menu | Athom support, not this app's developer inbox |
| Log lines inside the app | The process, continuously | The device, until a person sends an app diagnostic |

Collecting lines in the process is not sending. Sending is the menu action. Nothing in this change sends mail, forum posts, or a second report.

## What the 18:18 report shows about 1.0.229

The installed build is still `1.0.229`. These lines are not a test of the unshipped battery or memory edits.

Stdout covers 17:42–18:16 Europe/Paris (16:42–17:16 UTC). `[HEAP-SENTINEL]` stays `heap=34MB` on every sample, trend flat. There is no `MEMWARN`, no crash line, and no restart in that window. `rss=0MB` in that line is the known missing resident-set read, not a resident set of zero.

The button received presses at 17:50, 18:05 and 18:10 Europe/Paris, on OnOff and on command `0xFD`. Duplicate paths are dropped (`THROTTLE`, cross-path drop). There is no battery percent line and no voltage line. A recovery check says the capabilities already have values, so the stored tile value is still there. The hourly adapter probe is deferred ("Defer probe until wake / heap recovers"). No outbound button frame is logged in the window.

The free-text line at the top of the report was typed by our browser session. It is not a new request from the household.

Stderr repeats crash blocks from earlier processes. The GC ages visible in this receipt are about 19.0 s, 20.7 s and 20.8 s, with Mark-Compact stuck near 62 MB. The maintainer identifies those blocks as the same historical processes as the earlier report, including 6 Nov processes that had been alive about 340 s and 920 s. They are not new crashes of the 17:42–18:16 window. The native frame is still `JsonParser` / `MakeString` / `NewRawTwoByteString` with no JavaScript caller. A short process age makes startup a strong place to look. It does not exclude a later crash, and it does not name the value.

The Homey app-memory figure of 64.65 MB is a different counter from this 34 MB heap sample and from the historical ~62 MB GC. Do not subtract one from another, and do not treat the difference as free headroom under the old limit.

`JSON.parse` in the tree under review is the native function. There is no global replacement.
