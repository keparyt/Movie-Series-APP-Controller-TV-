# Movie Series TV

A TV-focused Electron media application with a dark Netflix-style interface, TMDB discovery, controller-friendly navigation, persistent My List/watch progress, and VidKing playback integration.

## Requirements

- Windows 10/11 for the Windows target
- Node.js 20+
- npm
- TMDB API key

## Quick Start on Windows

The repository includes ready-to-use `.bat` tools so you do not need to remember the npm commands.

### 1. Install dependencies

Double-click `setup.bat`.

### 2. Configure TMDB

Copy `.env.example` to `.env` and set:

```env
VITE_TMDB_API_KEY=your_key
```

### 3. Run the Electron app in development

Double-click `run-dev.bat`.

### 4. Build the production frontend

Double-click `build.bat`. This creates the Vite frontend in `dist/`.

### 5. Build the Windows EXE

For the complete Windows package, double-click either:

```text
package-windows.bat
```

or the dedicated:

```text
build-exe.bat
```

Both commands first build the production frontend and then run Electron Builder for Windows x64. The generated installer and portable executable are placed in:

```text
dist-electron/
```

The portable build can run without Node.js, npm, Vite, or the source project being installed on the target machine.

### 6. Launch the packaged application

Double-click `launch-packaged.bat`. It automatically finds the generated portable `.exe` in `dist-electron/`.

### 7. Clean generated files

Double-click `clean.bat` to remove `node_modules/`, `dist/`, and `dist-electron/`. Run `setup.bat` afterward to reinstall dependencies.

## Command-line equivalents

```bash
npm install
npm run dev
npm run build
npm run package
```

## Windows tools

| Tool | Purpose |
|---|---|
| `setup.bat` | Install dependencies |
| `run-dev.bat` | Start Vite + Electron development mode |
| `build.bat` | Build the production frontend into `dist/` |
| `package-windows.bat` | Build and package Windows x64 installer + portable EXE |
| `build-exe.bat` | Dedicated one-click production EXE/installer build |
| `launch-packaged.bat` | Launch the generated portable `.exe` |
| `clean.bat` | Remove generated dependencies and build output |

## Architecture

- React + Vite renderer
- Electron main/preload processes
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Controlled navigation and external-window handling
- LocalStorage for My List/watch-progress state

## Controller

The interface uses native buttons and clear focus treatment for controller/TV navigation. Controller input can be used across the application, with special mouse-style control inside the fullscreen player.

## Notes

TMDB is used for metadata/discovery. VidKing is used as the configured playback provider. Availability and embed behavior are controlled by those external services.
