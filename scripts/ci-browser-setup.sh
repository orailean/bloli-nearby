#!/bin/sh
# Disposable GitHub Ubuntu runners only. Avoid the Azure mirror when it stalls.
set -eu
if [ "${GITHUB_ACTIONS:-}" != true ]; then
  echo 'This setup is intended for GitHub Actions runners' >&2
  exit 1
fi
if [ -f /etc/apt/apt-mirrors.txt ]; then
  sudo sed -i 's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g; s|https://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' /etc/apt/apt-mirrors.txt
fi
printf 'Acquire::Retries "2";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' | sudo tee /etc/apt/apt.conf.d/99-bloli-network-timeouts >/dev/null
exec npx --no-install playwright install --with-deps "$@"
