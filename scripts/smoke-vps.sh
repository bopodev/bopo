#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:4020}"
WEB_URL="${WEB_URL:-http://localhost:4010}"
WS_URL="${WS_URL:-ws://localhost:4020/realtime?companyId=demo-company&channels=governance}"

printf '[smoke:vps] checking API health at %s/health\n' "$API_URL"
curl -fsS "$API_URL/health" >/dev/null

printf '[smoke:vps] checking web root at %s\n' "$WEB_URL"
curl -fsS "$WEB_URL" >/dev/null

printf '[smoke:vps] checking websocket endpoint (HTTP upgrade path) at %s\n' "$WS_URL"
case "$WS_URL" in
  ws://*)
    UPGRADE_URL="$(printf '%s' "$WS_URL" | sed 's#^ws://#http://#')"
    ;;
  wss://*)
    UPGRADE_URL="$(printf '%s' "$WS_URL" | sed 's#^wss://#https://#')"
    ;;
  *)
    UPGRADE_URL="$WS_URL"
    ;;
esac
curl -fsS -o /dev/null \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG9Xb3JsZDEyMzQ1Ng==" \
  "$UPGRADE_URL" || {
  printf '[smoke:vps] websocket upgrade check failed\n' >&2
  exit 1
}

printf '[smoke:vps] all checks passed\n'
