#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p .secrets
if [ ! -f .secrets/db_password ]; then openssl rand -hex 32 > .secrets/db_password; fi
if [ ! -f .env ]; then cp .env.example .env; fi
printf '%s\n' 'Local environment ready. Set CONTACT_EMAIL in .env before publishing.'
