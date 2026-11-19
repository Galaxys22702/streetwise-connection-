#!/usr/bin/env bash
set -euo pipefail
source_dir=/etc/letsencrypt/live/turn.streetwiseconnection.com
target_dir=/etc/streetwise/turn-tls
install -d -m 0750 -o root -g turnserver "$target_dir"
install -m 0644 -o root -g turnserver "$source_dir/fullchain.pem" "$target_dir/fullchain.pem"
install -m 0640 -o root -g turnserver "$source_dir/privkey.pem" "$target_dir/privkey.pem"
systemctl try-restart coturn
