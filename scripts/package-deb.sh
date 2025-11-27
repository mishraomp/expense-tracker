#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUTPUT_DIR="$ROOT_DIR/pkg"
RELEASE_DIR="$ROOT_DIR/release"

mkdir -p "$OUTPUT_DIR"

VERSION=$(git describe --tags --dirty --always 2>/dev/null || echo "0.0.0")

# Create temporary packaging directory
PKG_DIR=$(mktemp -d)

echo "Preparing package contents in $PKG_DIR"
mkdir -p "$PKG_DIR/opt/expense-tracker"
cp -r "$RELEASE_DIR/backend"/* "$PKG_DIR/opt/expense-tracker/"
cp -r "$RELEASE_DIR/frontend"/* "$PKG_DIR/opt/expense-tracker/public" || true

# Add systemd service and install script
mkdir -p "$PKG_DIR/usr/lib/expense-tracker"
cp packaging/linux/expense-tracker.service "$PKG_DIR/usr/lib/expense-tracker/expense-tracker.service"
cp packaging/linux/after-install.sh "$PKG_DIR/usr/lib/expense-tracker/after-install.sh"
chmod +x "$PKG_DIR/usr/lib/expense-tracker/after-install.sh"

fpm -s dir -t deb -n expense-tracker -v "$VERSION" \
  --prefix=/opt/expense-tracker -C "$PKG_DIR/opt/expense-tracker" . \
  --after-install "$PKG_DIR/usr/lib/expense-tracker/after-install.sh" \
  --deb-systemd "$PKG_DIR/usr/lib/expense-tracker/expense-tracker.service" \
  -p "$OUTPUT_DIR"

# Cleanup
rm -rf "$PKG_DIR"

echo "Created Debian package(s) in $OUTPUT_DIR"
