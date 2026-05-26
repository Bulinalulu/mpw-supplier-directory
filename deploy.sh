#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Building frontend..."
npm run build

echo "==> Copying dist to /var/www/mpw/dist..."
sudo mkdir -p /var/www/mpw
sudo rsync -a --delete dist/ /var/www/mpw/dist/

echo "==> Restarting API server..."
pm2 startOrRestart ecosystem.config.cjs --env production

echo "==> Done."
