# Medusa Agent App

Native desktop application for the Medusa endpoint security agent.

The app is a thin presentation layer on top of the headless `medusa-agent`
daemon. It runs in the menu bar / system tray, can be opened to a full window
for monitoring and configuration, and communicates with the daemon via:

1. **File I/O** — reading/writing `~/.medusa/agent-config.yaml`,
   `~/.medusa/gateway-policy.yaml`, and `~/.medusa/agent.db`. The daemon
   already mtime-polls these files (5s default).
2. **Local HTTP** — `http://127.0.0.1:27183` for real-time actions
   (pause, resume, force sync). Localhost-only, no auth.

Quitting the app **does not** stop the daemon. Protection continues.

## Stack

- [Tauri 2](https://tauri.app/) — Rust shell + system WebView (~5-10 MB bundle)
- React 19 + TypeScript + Tailwind 3
- Lifted design tokens from `medusa-frontend`

## Prerequisites

- **Node.js 20+** and **npm**
- **Rust toolchain** — install via [rustup](https://rustup.rs/):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- macOS only: Xcode Command Line Tools (`xcode-select --install`)
- Linux only: `libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `libssl-dev`,
  `libayatana-appindicator3-dev`

## Develop

```bash
npm install
npm run tauri:dev
```

The app should launch in dev mode with hot reload.

## Build

```bash
npm run tauri:build
```

Builds platform-native installers into `src-tauri/target/release/bundle/`.

## Project structure

```
medusa-agent-app/
├── src/                # React UI
│   ├── routes/         # Pages (Status, Servers, Activity, ...)
│   ├── components/     # Sidebar, Pause button, Posture score, ...
│   ├── hooks/          # use-agent-state, use-events, use-config
│   └── lib/            # Tauri invoke wrappers
├── src-tauri/          # Rust core
│   ├── src/
│   │   ├── main.rs     # Entry point + tray setup
│   │   ├── tray.rs     # Menu bar logic
│   │   └── commands/   # File I/O, daemon HTTP calls
│   ├── icons/          # App + tray icons
│   ├── tauri.conf.json
│   └── Cargo.toml
└── package.json
```

## Architecture decisions

See `BUILD_PLAN.md` in the parent directory for the full design doc.
