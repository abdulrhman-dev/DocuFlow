#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required to create the bundle." >&2
  exit 1
fi

OUTPUT_NAME="${1:-DocuFlow-bundle.zip}"
if [[ "$OUTPUT_NAME" = /* ]]; then
  OUTPUT_ZIP="$OUTPUT_NAME"
else
  OUTPUT_ZIP="$ROOT_DIR/$OUTPUT_NAME"
fi

TMP_DIR="$(mktemp -d)"
STAGING_DIR="$TMP_DIR/DocuFlow"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

mkdir -p "$STAGING_DIR"

cp -R "$ROOT_DIR/backend/." "$STAGING_DIR/backend/"
cp -R "$ROOT_DIR/frontend/." "$STAGING_DIR/frontend/"

find "$STAGING_DIR" -type d -name node_modules -prune -exec rm -rf {} +
find "$STAGING_DIR" -type f -name '.env' -delete
find "$STAGING_DIR" -type f -name '.env.local' -delete
find "$STAGING_DIR" -type f -name '.env.development' -delete
find "$STAGING_DIR" -type f -name '.env.production' -delete
find "$STAGING_DIR" -type f -name '.env.test' -delete
while IFS= read -r env_file; do
  if [[ "$(basename "$env_file")" != ".env.example" ]]; then
    rm -f "$env_file"
  fi
done < <(find "$STAGING_DIR" -type f -name '.env.*')

find "$STAGING_DIR/backend/public" -type f -iname '*.png' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.jpg' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.jpeg' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.webp' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.gif' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.svg' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.bmp' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.ico' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.tif' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.tiff' -delete
find "$STAGING_DIR/backend/public" -type f -iname '*.avif' -delete

(cd "$TMP_DIR" && zip -qr "$OUTPUT_ZIP" DocuFlow)

echo "Created bundle: $OUTPUT_ZIP"