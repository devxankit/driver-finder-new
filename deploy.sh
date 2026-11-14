#!/usr/bin/env bash
# Driver Finder: update the live server (grtchalakbridging.com) from GitHub.
#
# On the VPS, as the driverfinder user:
#   bash ~/htdocs/grtchalakbridging.com/deploy.sh
#
# It pulls main, installs packages, rebuilds the website (landing page and
# admin panel), restarts the backend with pm2 and checks that it answers.
# Secrets stay in backend/.env on the server (never in git). Uploaded files
# live in ~/uploads, outside the code, so updates never touch them.

main() {
  set -euo pipefail
  local APP_DIR
  APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$APP_DIR"

  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"

  echo "==> Pulling the latest code"
  git pull --ff-only origin main
  git log -1 --format='    %h %s (%cr)'

  echo "==> Backend packages"
  (cd backend && npm ci --omit=dev --no-audit --no-fund)
  (cd backend && node src/scripts/restoreAssets.js)

  echo "==> Building the website"
  (
    cd frontend
    npm ci --no-audit --no-fund
    rm -rf dist-new
    npx vite build --outDir dist-new --emptyOutDir --logLevel warn
    rm -rf dist
    mv dist-new dist
  )

  echo "==> Restarting the backend"
  # Start fresh from backend/ecosystem.config.cjs so its settings always apply.
  # The old process gets a SIGINT and finishes its requests first.
  pm2 delete driver-finder >/dev/null 2>&1 || true
  pm2 start backend/ecosystem.config.cjs >/dev/null
  pm2 save >/dev/null

  echo "==> Checking"
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:5000/api/health >/dev/null 2>&1; then
      echo "    Backend is up: https://grtchalakbridging.com"
      return 0
    fi
    sleep 2
  done
  echo "    Backend did not answer within 60 s. Last log lines:"
  pm2 logs driver-finder --lines 40 --nostream
  return 1
}

main "$@"
