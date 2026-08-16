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

Double-click:

```text
setup.bat
```

Or run:

```bat
setup.bat
```

### 2. Configure TMDB

Copy `.env.example` to `.env` and set:

```env
VITE_TMDB_API_KEY=your_key
```

### 3. Run the Electron app in development

Double-click:

```text
run-dev.bat
```

This starts Vite and Electron together.

### 4. Build the production frontend

Double-click:

```text
build.bat
```

This runs the Vite production build and creates `dist/`.

### 5. Create the Windows Electron application

Double-click:

```text
package-windows.bat
```

This runs the production build and Electron Builder. The Windows installer and portable executable are created in:

```text
dist-electron/
```

### 6. Launch the packaged application

After packaging, double-click:

```text
launch-packaged.bat
```

The script automatically finds the generated portable `.exe` and launches it.

### 7. Clean generated files

To remove build/dependency output and start fresh, double-click:

```text
clean.bat
```

This removes:

```text
node_modules/
dist/
dist-electron/
```

Run `setup.bat` again afterward to reinstall dependencies.

## Command-line equivalents

The BAT files are wrappers around these commands:

```bash
npm install
npm run dev
npm run build
npm run package
```

## Development

```bash
npm install
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

## Windows tools

| Tool | Purpose |
|---|---|
| `setup.bat` | Install and verify Node.js/npm dependencies |
| `run-dev.bat` | Start Vite + Electron development mode |
| `build.bat` | Build the production frontend |
| `package-windows.bat` | Build and package the Windows Electron application |
| `launch-packaged.bat` | Launch the generated portable `.exe` |
| `clean.bat` | Remove generated dependencies and build output |
