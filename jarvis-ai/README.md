# JARVIS AI — Streetwise Connection
First-stage, approval-first AI dashboard. This is a prototype, not a deployed private service.

## Run locally
1. Install Node.js 20+.
2. In this directory, set OPENAI_API_KEY as a server-side environment variable (never paste it into frontend code or commit it).
3. Run `npm start`.
4. Visit http://127.0.0.1:3000.

The app binds to localhost by default and does not include authentication, so **do not expose it to the public internet**. Do not deploy it publicly until proper login, authorization, abuse protection, rate limiting, and secure secret storage are added.

## Current scope
- Text-only chat through the OpenAI Responses API
- Server-side API key handling
- Session-only request history in the browser
- No external side effects or automatic posting
- No real video background replacement yet

## Planned
Authentication, persistent private history, approval queue, voice interface, and a licensed video-editing pipeline with subject masking and Fremont Street background assets.
