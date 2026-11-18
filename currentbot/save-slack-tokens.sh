#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "1) Paste your Bot token (starts with xoxb-) and press Enter"
IFS= read -r BOT
echo "2) Paste your App token (starts with xapp-) and press Enter"
IFS= read -r APP

BOT="${BOT//$'\r'/}"
APP="${APP//$'\r'/}"
BOT="$(echo -n "$BOT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
APP="$(echo -n "$APP" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

if [[ ! "$BOT" =~ ^xoxb- ]]; then
  echo "That bot token does not start with xoxb-. Try again."
  exit 1
fi
if [[ ! "$APP" =~ ^xapp- ]]; then
  echo "That app token does not start with xapp-. Try again."
  exit 1
fi
if [[ "$BOT" == *PASTE_* ]] || [[ "$APP" == *PASTE_* ]]; then
  echo "Still looks like a placeholder. Paste the real tokens from Slack."
  exit 1
fi

umask 077
printf 'ZOOMINFO_BRIEF_SLACK_BOT_TOKEN=%s\nZOOMINFO_BRIEF_SLACK_APP_TOKEN=%s\n' "$BOT" "$APP" > .env.local
echo "Saved to .env.local"
echo "Bot token length: ${#BOT}"
echo "App token length: ${#APP}"
