# Build Guide

This guide explains how to run QVAC PayGuard for development, record a demo without packaging, and create desktop builds for common operating systems.

## Quick Demo Run

For recording the app, use development mode. This avoids AppImage/FUSE/browser-profile packaging issues and keeps QVAC running from the normal workspace.

```bash
npm install
npm run build -w apps/qvac-agent
npm run dev:desktop
```

The desktop app opens through Electron. Keep the terminal open while recording.

## Production Build

Install dependencies first:

```bash
npm install
```

Run a full project build:

```bash
npm run build
```

Package the desktop app:

```bash
npm run package:desktop
```

The Linux AppImage is written to:

```text
apps/desktop/release/QVAC PayGuard-0.1.0.AppImage
```

Run it:

```bash
./apps/desktop/release/QVAC\ PayGuard-0.1.0.AppImage
```

## Linux

The current packaged target is Linux AppImage.

Requirements:

```bash
sudo dnf install fuse fuse-libs
```

On some Fedora systems, AppImages need FUSE 2 compatibility. If the AppImage says `libfuse.so.2` is missing, install the FUSE package above.

Build:

```bash
npm run package:desktop
```

If you want the app to show in the app launcher, create a desktop entry:

```bash
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/qvac-payguard.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=QVAC PayGuard
Comment=Local-first guarded payment assistant
Exec=/home/hickson/payguard/apps/desktop/release/QVAC PayGuard-0.1.0.AppImage
Icon=/home/hickson/payguard/apps/desktop/assets/icon.png
Terminal=false
Categories=Office;Finance;
StartupNotify=true
EOF
update-desktop-database ~/.local/share/applications || true
```

Adjust the `Exec` and `Icon` paths if the repo is in a different folder.

## macOS

Build macOS packages on macOS. Cross-building macOS packages from Linux is not recommended.

Install dependencies:

```bash
npm install
```

Run development mode:

```bash
npm run build -w apps/qvac-agent
npm run dev:desktop
```

Package with Electron Builder from the desktop workspace:

```bash
npm run build -w apps/desktop
npx electron-builder --mac --publish never -c apps/desktop/package.json
```

For a real signed release, configure Apple Developer signing, notarization, and hardened runtime. The MVP build guide does not include release signing.

## Windows

Build Windows packages on Windows for the most reliable result.

Install dependencies:

```powershell
npm install
```

Run development mode:

```powershell
npm run build -w apps/qvac-agent
npm run dev:desktop
```

Package with Electron Builder:

```powershell
npm run build -w apps/desktop
npx electron-builder --win --publish never -c apps/desktop/package.json
```

For a real signed release, configure a Windows code signing certificate. The MVP build guide does not include release signing.

## QVAC Packaging Notes

QVAC runs local OCR, RAG, and LLM work through SDK worker processes. That is why production packaging needs extra care:

- The desktop package includes QVAC SDK peer dependencies explicitly in `apps/desktop/package.json`.
- `asar` is disabled for the MVP package because QVAC loads runtime files and native/prebuilt modules from the filesystem.
- `apps/desktop/build/after-pack.cjs` marks the Bare runtime binary executable during packaging.
- The Electron main process copies the Bare executable out of the AppImage mount into a writable app data folder before QVAC starts. This avoids `EACCES` errors on Fedora/AppImage mounts.

## Troubleshooting

### AppImage says FUSE is missing

Install FUSE compatibility:

```bash
sudo dnf install fuse fuse-libs
```

Alternative extraction mode:

```bash
./apps/desktop/release/QVAC\ PayGuard-0.1.0.AppImage --appimage-extract
./squashfs-root/AppRun
```

### App opens as a blank dark window

This usually means renderer assets were built with absolute paths. The Vite config must keep:

```ts
base: "./"
```

Then rebuild:

```bash
npm run package:desktop
```

### JavaScript error: missing `bare-rpc` or another QVAC package

The packaged app is missing a QVAC SDK peer dependency. Make sure `apps/desktop/package.json` includes the QVAC peer packages, then reinstall and rebuild:

```bash
npm install
npm run package:desktop
```

### QVAC OCR error: `RPC_INIT_TIMEOUT`

This means the QVAC worker process did not start or did not connect back to the app.

Common causes:

- The AppImage was not rebuilt after the latest packaging fixes.
- The Bare runtime binary is not executable inside the package.
- The OS blocked execution from the AppImage mount.

Fix:

```bash
npm run package:desktop
```

Then reopen the new AppImage. If it still fails, record the demo using development mode:

```bash
npm run build -w apps/qvac-agent
npm run dev:desktop
```

### Browser opens Firefox instead of Brave

If the AppImage was run with portable home mode, it can use a clean browser/default-app profile:

```text
QVAC PayGuard-0.1.0.AppImage.home
```

Remove the portable home folder:

```bash
rm -rf "apps/desktop/release/QVAC PayGuard-0.1.0.AppImage.home"
```

Then open the AppImage again.

### Phantom is not available in this browser

The signing bridge opened a browser profile without Phantom installed. Make sure your system default browser is the one where Phantom is installed, or run the demo in development mode.

### AppImage does not appear in the app launcher

AppImages do not automatically install themselves into the Linux app launcher. Add a `.desktop` file under:

```text
~/.local/share/applications
```

Then run:

```bash
update-desktop-database ~/.local/share/applications || true
```

You may need to log out and back in before the app appears.

## Recommended Demo Path

For the project demo, use:

```bash
npm run build -w apps/qvac-agent
npm run dev:desktop
```

This is the most stable path for recording because it avoids OS-specific AppImage behavior while still showing the real Electron app, wallet bridge, QVAC OCR/RAG/LLM flow, direct payments, and guarded payments.
