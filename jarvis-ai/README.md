# JARVIS AI — Streetwise Connection

A localhost-only private chat prototype; no Vercel deployment is needed.

## Run privately on an HP Windows 10 laptop
1. Install Node.js 20+ from https://nodejs.org/en/download (choose the Windows LTS installer).
2. On GitHub, select branch `jarvis-ai-mvp-20261010` in `Galaxys22702/streetwise-connection-`, then choose **Code > Download ZIP**.
3. Unzip the folder. Open the `jarvis-ai` folder.
4. Click the File Explorer address bar, type `powershell`, and press Enter to open a terminal in that folder.
5. Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-jarvis.ps1`.
6. Paste your OpenAI API key into the hidden prompt; press Enter. Do **not** paste the key into chat or GitHub.
7. Visit http://127.0.0.1:3000 (the launcher also opens a browser). Keep the terminal window open while using JARVIS.

To stop: press Ctrl+C in the terminal, then close the window. API key stays only in the launcher process memory and is not saved to a file.

## Other operating systems
Set `OPENAI_API_KEY` securely in your shell/session, then run `npm start`. See `package.json`.

## Security and capabilities
- The server binds only to `127.0.0.1`; **do not port-forward it or expose it to the public internet.**
- Server-side OpenAI Responses API; requires a valid key with available API credit.
- Text-only conversation and browser-session request history; no actual connector execution.
- Not yet an authenticated web service, automation agent, phone-accessible shared service, or video editor.
