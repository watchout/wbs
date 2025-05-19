#!/usr/bin/env bash
# Minimal bootstrap script for a freshly provisioned VPS
# Usage: ./scripts/bootstrap_vps.sh <host>

set -euo pipefail

HOST=${1:?"Usage: $0 <host>"}

ssh root@"$HOST" bash -s <<'EOS'
set -euo pipefail
apt-get update -y
apt-get install -y docker.io docker-compose
systemctl enable --now docker

docker run -d --restart=always \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower
EOS
