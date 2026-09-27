# Rooted.Voice

Rooted.Voice is a calm, local-first speaking practice ritual. Draw an unpracticed topic, prepare in silence, record your response, review it in three modes, and watch your practice grow into a Knowledge Garden.

## Run locally

This is a static ES2022 app with no build step. Serve the repository over HTTP (camera, microphone, and File System Access are not available from `file://` URLs):

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

The app uses IndexedDB for metadata and seeds exactly 10 categories and 300 topics on first launch. Video binaries are saved through the browser's local storage APIs and are never uploaded.

## Browser storage

- Chromium-based browsers (Chrome, Edge, and compatible browsers) support File System Access. Choose a root folder in Settings; each recording is saved in a topic/date folder there.
- Firefox and Safari use Origin Private File System (OPFS), with a **Download to your computer** link on each recording for a regular disk copy.
- Camera and microphone access requires HTTPS or localhost. The first recording asks for permissions. If a chosen folder is unavailable, Settings can re-select it.

## Deploy to Vercel

Import the repository into Vercel or run `vercel` from the repository root. No build command and no server functions are needed; `vercel.json` rewrites routes to the static entry point.

## Design decisions

The graph uses a deterministic lightweight force layout so it remains dependency-free and settles quickly for reduced-motion users. The graph is complemented by a searchable, keyboard-accessible hierarchy list. Multiple recordings for one topic are intentionally available from its Knowledge Garden detail panel, not from the exhausted draw screen. Clearing metadata leaves any real files in the chosen folder untouched.

## Scope

This v0 deliberately excludes accounts, cloud sync, push notifications, source switching, resolution controls, and crash recovery. It is designed for a single person practicing locally.
