#!/bin/bash
# Shirley's English Games — двойной щелчок на Mac: сервер (Node 22.13+) или офлайн-режим
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1 && node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"; then
  echo "Starting Shirley's English Games... Keep this window open during the lesson."
  (sleep 2; open http://localhost:3000) &
  node --no-warnings server.js
else
  echo "Node.js 22.13+ not found - opening OFFLINE mode (results are not saved)."
  open public/index.html
fi
