# RCAI Inbox Demo

Standalone marketing demo of the **real ReadyChatAI "Messages" inbox**, animated, wrapped in an
RCAI-landing frame with a tab selector for three animation treatments.

- `index.html` — landing shell (RCAI header + hero + Kommo-style tabs + browser-framed iframe).
- `variant-realtime.html` / `variant-cinematic.html` / `variant-mascot.html` — the three animation variants.

Pure static HTML (Tailwind Play CDN + Urbanist + RemixIcon, vanilla JS). Served by nginx via the `Dockerfile`.

**Mental model shown:** customers write from their own WhatsApp/Facebook/Instagram → messages arrive
**inbound** (left, gray); the **bot replies** (right, purple). The composer (our side, human-agent
takeover) stays idle. The customer profile is static record info — no invented AI-extracted-fields panel.

Deployed on Coolify (Internal Sites) → https://inbox-demo.readychatai.lat
