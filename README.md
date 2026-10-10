# Rooted.Voice

Rooted.Voice is a calm, local-first speaking practice ritual. Add your own topics, prepare in silence, record your response, review it, and watch practice grow into a 3D knowledge network.

## Run locally

This is a static ES2022 app with no build step. Serve the repository over HTTP (camera, microphone, and File System Access are not available from `file://` URLs):

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

The app uses IndexedDB for metadata. Categories are available as empty shelves; topics and recordings are not preloaded. Add your own catalog in Settings. Video binaries are saved through the browser's local storage APIs and are never uploaded.

If you previously launched an older build that seeded 300 demo topics, unused demo topics are removed on the next load when you have no recordings yet. Use **Clear all metadata** in Settings if you want a completely empty store.

## Network

The Knowledge Network is a 3D graph you can drag a full 360°, zoom with the scroll wheel, open in full screen, and click to play a recorded video. The total video count animates when the view appears. Category cards show practiced percent with sliding digits. Research and speaking sessions use a sliding countdown clock.

## Browser storage

- Chromium-based browsers (Chrome, Edge, and compatible browsers) support File System Access. Choose a root folder in Settings; each recording is saved in a topic/date folder there.
- Firefox and Safari use Origin Private File System (OPFS), with a **Download to your computer** link on each recording for a regular disk copy.
- Camera and microphone access requires HTTPS or localhost. The first recording asks for permissions. If a chosen folder is unavailable, Settings can re-select it.

## Deploy to Vercel

Import the repository into Vercel or run `vercel` from the repository root. No build command and no server functions are needed; `vercel.json` rewrites routes to the static entry point.

## Scope

This v0 deliberately excludes accounts, cloud sync, push notifications, source switching, resolution controls, and crash recovery. It is designed for a single person practicing locally.
