# Windows laptop node

This is the exception to the older note that every node pairing stays manual.

`JARVIS_APPROVE_WINDOWS_NODE=1` lets the gateway approve one Windows device. The device must present platform `win32` or `windows` and a display name exactly equal to the Railway variable `JARVIS_NODE_DISPLAY_NAME`. That name is not stored in git. The first accepted device id is pinned in the OpenClaw state directory; a different laptop with the same name is ignored.

Command access is separate. Only `system.run`, `system.run.prepare`, `system.which`, `system.notify`, `device.info`, and `device.status` can be granted. Camera, screen, and talk requests are left pending. After that grant, the node policy is `ask: always` with `askFallback: deny`, so each command still waits for approval. If that policy cannot be set, the command grant is removed.

Set `JARVIS_APPROVE_WINDOWS_NODE=0` and redeploy to stop new laptop pairing. Existing operator-browser approval is unchanged.
