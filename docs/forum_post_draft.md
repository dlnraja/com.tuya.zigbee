Hi everyone,

I've pushed the new versions to GitHub.

* **v7.5.50** is now live on the `stable-v7` branch.
* **v8.1.0** (previously the v5.11.x experimental) is pushed to the `master` branch.

Please note that **this is still the same overall codebase** but split between stable legacy (SDK2/v7) and experimental bleeding-edge (SDK3/v8+).

A quick reminder on why there are different versions:
* **v7.x.x (Stable)**: This is for those who want stability. It's based on older, proven mechanics.
* **v8.x.x (Experimental)**: This is a deep rewrite using Homey SDK3 standards. It handles bidirectional sync, complex battery curves, and dynamic data points much better, but it's meant for testing and edge cases.

**Important Notice:**
I want to make it clear that I do not officially support these apps anymore, and they have never passed the official Homey App Store publication stage. I am not abandoning the project completely, but **if I continue to improve it, it is strictly for my own personal use.** I'm sharing these updates here for those who know what they are doing and want to manually test the changes via CLI.

Thanks to everyone who has contributed to testing, especially with the sleepy devices and button issues.

Cheers,
Johan
