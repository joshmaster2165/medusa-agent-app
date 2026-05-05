# Icons

Tauri expects platform icons in this directory. **The build will fail
without them.** Generate them from the master Medusa logo before
running `npm run tauri:build`:

| File | Format | Use |
|------|--------|-----|
| `icon.icns` | macOS bundle | `bundle.icon` |
| `icon.ico` | Windows | `bundle.icon` |
| `32x32.png` | PNG | small icon |
| `128x128.png` | PNG | mid icon |
| `128x128@2x.png` | PNG | retina (256×256) |
| `512x512.png` | PNG | Linux desktop file |
| `tray-icon.png` | PNG, monochrome 22×22 (or 44×44 @2x) | menu bar |

## Quick generation script (macOS)

```bash
# Generate all PNG sizes from a master 1024x1024 logo
LOGO=../../Medusa\ Graphics\ and\ Media/medusa-logo.png

sips -z 32 32 "$LOGO" --out 32x32.png
sips -z 128 128 "$LOGO" --out 128x128.png
sips -z 256 256 "$LOGO" --out 128x128@2x.png
sips -z 512 512 "$LOGO" --out 512x512.png

# Generate .icns
mkdir Medusa.iconset
for size in 16 32 64 128 256 512 1024; do
  sips -z $size $size "$LOGO" --out Medusa.iconset/icon_${size}x${size}.png
done
iconutil -c icns Medusa.iconset
mv Medusa.icns icon.icns
rm -rf Medusa.iconset

# Generate .ico (requires ImageMagick: brew install imagemagick)
magick "$LOGO" -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Tray icon — use the mono variant; 22x22 base + 44x44 @2x for retina
sips -z 22 22 ../../Medusa\ Graphics\ and\ Media/medusa-logo-mono.svg --out tray-icon.png
```

For now the build will fail until these are placed here. This is
intentional — the icons are part of the brand and must come from the
designer-provided source files in `Medusa Graphics and Media/`.
