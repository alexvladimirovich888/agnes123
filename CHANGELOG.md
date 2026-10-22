# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.6.0] - 2026-10-22

### Changed
- The project is now **SourceBots**: new name, logo (a bot face inside a four-colour source ring), favicons and social image.
- Complete visual redesign: new palette and type (Bricolage Grotesque, Geist), scrolling landing page with a 3D hero,
  a capabilities section with a live tool-trail demo, a "Run it your way" section and a new footer.
- New 3D agents with expressive faces: blinking, cursor-following eyes, smiles, squints, talking mouths and hand gestures.
- Each agent has props that match its job and personality: PLUTUS (monocle, coin, market hologram),
  HEPHAESTUS (goggles, hammer, code hologram), HERMES (headset, magnifier, wings), PROTEUS (shape-shifting gem, shards).
- Agents orbit a glowing "source" core with inward-flowing particles; scrolling tilts and pulls the camera back.
- Chat shows the agent's personality traits next to its live 3D figure.

### Performance
- Adaptive render resolution, 3D paused when off-screen or behind the chat, no full-screen blend or blur layers over WebGL.

## [2.5.0] - 2026-10-20

### Added
- Agent runtime with tool use: web search, page reading, isolated code sandbox (bash and Python) and
  `http_request` for public REST APIs.
- x402 support: `402 Payment Required` responses are parsed (v1 body and v2 header) and the price is reported.
- Fully local mode with any OpenAI-compatible server (Ollama, LM Studio, vLLM, llama.cpp).
- Tool trail in chat showing every step an agent took.
- Real-time 3D agents with idle, attention, speaking, thinking, answering and error states.
- New brand: logo, favicon set and social image.
- Step-by-step Run locally guide for Node.js and Docker; multi-stage `Dockerfile`.
- Test suite (Vitest), ESLint, CI on Node.js 20/22, Docker build check, CodeQL, OpenSSF Scorecard, Dependabot.

### Changed
- Agents renamed: VEX → PLUTUS, BYTE → HEPHAESTUS, PULSE → HERMES, MORPH → PROTEUS (ids unchanged).
- Markdown tables render in chat.

### Security
- SSRF guard for outbound API calls, including IP literals and DNS-resolved private addresses.
