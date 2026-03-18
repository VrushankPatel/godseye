#!/usr/bin/env bash

# Copy this file to scripts/local-secrets.sh and fill in your local values.
# That file is gitignored and can be sourced by scripts/with-local-secrets.sh.

export VITE_GOOGLE_MAPS_3D_KEY=""
export VITE_GOOGLE_MAPS_API_KEY="${VITE_GOOGLE_MAPS_3D_KEY:-}"
export VITE_MAPBOX_ACCESS_TOKEN=""
export VITE_YOUTUBE_API_KEY=""
export VITE_GUARDIAN_API_KEY=""
export VITE_AISSTREAM_API_KEY=""
