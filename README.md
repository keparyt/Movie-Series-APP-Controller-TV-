# Movie Series TV

A TV-focused Electron media application with a dark Netflix-style interface, TMDB discovery, controller-friendly navigation, persistent My List/watch progress, and VidKing playback integration.

## Requirements

- Node.js 20+
- npm
- TMDB API key
- Windows for the packaged target

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and set:

```env
VITE_TMDB_API_KEY=your_key
```

## Development

```bash
npm run dev
```

## Production frontend

```bash
npm run build
```

## Windows package

```bash
npm run package
```

The Windows installer/portable executable is emitted under `dist-electron/`.

## Architecture

- React + Vite renderer
- Electron main/preload processes
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Controlled navigation and external-window handling
- LocalStorage for My List and watch-progress state

## Notes

TMDB is used for metadata/discovery. VidKing is used as the configured playback provider. Availability and embed behavior are controlled by those external services.

## Controller

The interface uses native buttons and a clear focus treatment so keyboard/TV remote navigation can be used without a mouse. Arrow/Enter/Escape behavior follows standard browser focus navigation.
