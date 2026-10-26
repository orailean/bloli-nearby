# loo.bloli.com: existing Docker Nginx and Let's Encrypt

The current deployment serves both Loo and Kippe from the renamed Bloli Nearby checkout. Use [the multi-site migration/update guide](bloli-nearby-migration.md) for current paths and timers; this original Loo integration guide remains a reference for the existing proxy and certificate setup.

## Status and scope

Host inspected read-only on 2026-10-26 via `ssh-contabo` (`ssh oliver@173.212.194.159`). No host configuration, DNS, containers, certificates, timers, or cron entries were changed. All configuration below is a future operator procedure, not an applied deployment. The app is still at the OpenSpec proposal stage.

Keep the existing Docker Nginx. Do not install host Nginx, publish another service on ports 80/443, or use `certbot --nginx` against the host. Host Certbot with webroot validation already fits the container's mounts.

## Observed setup

| Item | Actual value |
| --- | --- |
| Host | `vmd34296`, Debian 11 |
| Domain | `loo.bloli.com` |
| DNS checked | A: `173.212.194.159`; no AAAA response |
| Public reverse proxy | Container `nginx`, running Nginx 1.25.4 |
| Existing Compose | `/home/oliver/stack/nginx/docker-compose.yml` |
| Public ports | 80, 443, and existing unrelated port 5000 |
| Existing Docker network | `nginx_default` |
| Included virtual hosts | `/etc/nginx/conf.d/*.conf` inside the container |
| Config persistence | Named volume `nginx_nginx_conf` at `/etc/nginx/conf.d` |
| Host volume location observed | `/var/lib/docker/volumes/nginx_nginx_conf/_data` |
| Certificate mount | Host `/etc/letsencrypt` → same container path |
| Challenge mount | Host `/var/lib/dehydrated/acme-challenges` → same container path |
| Existing website mount | `/home/oliver/stack/nginx/www` → `/usr/share/nginx/html` |
| Host Certbot | `/usr/bin/certbot` 1.12.0; `/snap/bin/certbot` 5.8.0 |
| Renewal timers | Both `certbot.timer` and `snap.certbot.renew.timer` enabled |

Existing renewal files mostly use webroot authentication at `/var/lib/dehydrated/acme-challenges`. Existing Nginx configuration passes `nginx -t`, with pre-existing HTTP/2/protocol warnings in other virtual hosts.

Both timer services have recent renewal failures for `menuyoo.bloli.com` (challenge failure) and `ofertim.ro` (manual plugin without an authentication hook). These are separate sites; this app's setup does not repair or remove their certificates.

The deploy-hook directory was empty. Root crontab also contains a monthly renewal command with an inline `docker exec nginx nginx -s reload` deploy hook. That hook applies only to that cron invocation, not to renewals completed by either timer. Therefore a successful timer renewal does not have an observed deploy hook to activate the certificate in Docker Nginx.

Ready-to-copy local templates are in [deploy/nginx](../../deploy/nginx/) and [deploy/letsencrypt](../../deploy/letsencrypt/). These files are prepared only; nothing has been installed on the host.

## Files to configure later

| File | Purpose |
| --- | --- |
| App Compose file, to be created during implementation | Connect the app gateway to `nginx_default` |
| `/etc/nginx/conf.d/loo.bloli.com.conf` inside `nginx` | New dedicated virtual host, persisted in the existing named volume |
| `/etc/letsencrypt/live/loo.bloli.com/` on host | Certificate lineage created by Certbot, already mounted in Nginx |
| `/etc/letsencrypt/renewal/loo.bloli.com.conf` on host | Generated renewal settings; do not hand-edit |
| `/etc/letsencrypt/renewal-hooks/deploy/50-loo-nginx-reload` on host | Reload Docker Nginx after successful renewal of this certificate |

No change to the existing Nginx Compose file or its mounts is needed for this arrangement. Use `docker cp` to install the new virtual host into the mounted configuration volume; avoid directly managing Docker's internal volume directory.

## 1. Connect the future app gateway

The implementation must provide one HTTP gateway serving the frontend and forwarding `/api/` requests to the internal API. The browser loads public OSM tiles directly; the gateway does not proxy tile requests. Attach only this gateway to the existing proxy network. Example fragment to merge into the future app Compose file (not a runnable complete Compose stack):

```yaml
services:
  web:
    # Existing app gateway build/image, routes, and internal network go here.
    expose:
      - "80"
    networks:
      default: {}
      edge:
        aliases:
          - find-a-loo-web

networks:
  edge:
    external: true
    name: nginx_default
```

The app must not publish host ports 80 or 443. Database/API services remain on the app's private network; the initial release has no tile-server service. The alias `find-a-loo-web` must be unique. Nginx uses Docker DNS at `127.0.0.11` with request-time resolution, so app recreation does not require pinning a container IP, and temporary app absence does not prevent unrelated Nginx virtual hosts loading.

Verify the network still exists before deploying:

```bash
docker network inspect nginx_default
```

## 2. Verify DNS and back up proxy configuration

Run the following later on the host. Commands below that write files or reload services are intentionally not executed as part of documenting the setup.

```bash
dig +short A loo.bloli.com
dig +short AAAA loo.bloli.com
docker exec nginx nginx -t
mkdir -p "$HOME/find-a-loo-nginx-backup"
docker cp nginx:/etc/nginx/conf.d "$HOME/find-a-loo-nginx-backup/"
```

The A record must resolve to this host. Publish an AAAA record only if the domain actually reaches this Nginx over IPv6. The current TTL shown in the DNS UI is 86400 seconds, so older cached answers may persist for a day after changes. Port 80 must remain externally reachable for HTTP-01 issuance and renewals.

## 3. Install an HTTP-only bootstrap virtual host

Save this on the host as `loo.bloli.com.bootstrap.conf`. Do not reference certificate files before issuance.

```nginx
server {
    listen 80;
    server_name loo.bloli.com;
    access_log off;

    location ^~ /.well-known/acme-challenge/ {
        root /var/lib/dehydrated/acme-challenges;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        default_type text/plain;
        return 200 "Find a Loo HTTPS setup in progress\n";
    }
}
```

Confirm the destination file does not already exist. If it does, inspect and back it up rather than overwriting it blindly.

```bash
docker exec nginx test ! -e /etc/nginx/conf.d/loo.bloli.com.conf
docker cp loo.bloli.com.bootstrap.conf nginx:/etc/nginx/conf.d/loo.bloli.com.conf
docker exec nginx nginx -t
```

Only if the syntax check succeeds:

```bash
docker exec nginx nginx -s reload
sudo install -d -m 0755 /var/lib/dehydrated/acme-challenges/.well-known/acme-challenge
printf '%s\n' 'loo-acme-check' | sudo tee /var/lib/dehydrated/acme-challenges/.well-known/acme-challenge/loo-probe >/dev/null
```

From a separate internet connection, verify an HTTP 200 and the exact body `loo-acme-check`:

```bash
curl --fail http://loo.bloli.com/.well-known/acme-challenge/loo-probe
```

After verification, remove only the test file:

```bash
sudo rm /var/lib/dehydrated/acme-challenges/.well-known/acme-challenge/loo-probe
```

The `root` mapping is intentional: Certbot writes under `WEBROOT/.well-known/acme-challenge/`. Keep exactly this mapping for the final HTTP virtual host too.

## 4. Issue the certificate using existing host Certbot

Use the current Snap executable explicitly, avoiding the older distro executable. Replace the email address with your actual certificate contact email.

```bash
sudo /snap/bin/certbot certonly \
  --webroot -w /var/lib/dehydrated/acme-challenges \
  --cert-name loo.bloli.com \
  -d loo.bloli.com \
  --email YOUR_EMAIL_ADDRESS \
  --agree-tos --non-interactive
```

This records webroot authentication for unattended renewal. It does not stop or rewrite Nginx. Check the resulting lineage:

```bash
sudo /snap/bin/certbot certificates --cert-name loo.bloli.com
```

Use the certificate paths printed by Certbot if a pre-existing lineage causes different paths.

## 5. Install the final HTTPS virtual host

Save this on the host as `loo.bloli.com.https.conf`. The app gateway from step 1 must eventually be reachable as `find-a-loo-web:80`; HTTPS can be provisioned first, but app requests will return 502 until it exists.

```nginx
server {
    listen 80;
    server_name loo.bloli.com;
    access_log off;

    location ^~ /.well-known/acme-challenge/ {
        root /var/lib/dehydrated/acme-challenges;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://loo.bloli.com$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name loo.bloli.com;

    ssl_certificate /etc/letsencrypt/live/loo.bloli.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/loo.bloli.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Search query strings contain coordinates; do not inherit the main log.
    access_log off;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    resolver 127.0.0.11 valid=30s ipv6=off;
    resolver_timeout 5s;

    location / {
        set $loo_upstream http://find-a-loo-web:80;
        proxy_pass $loo_upstream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }
}
```

No request URI is appended to `proxy_pass`, so paths and query strings pass through unchanged. The app gateway must also avoid coordinate logging and trust forwarded headers only from its proxy. Preserve the Referer for direct public OSM tile requests; do not override this policy with no-referrer in the app. Any future Content-Security-Policy must permit tile images from https://tile.openstreetmap.org. The observed Nginx 1.25.4 supports `http2 on`; pre-existing listen/protocol warnings elsewhere need separate maintenance.

Install, check, and then reload only on success:

```bash
docker cp loo.bloli.com.https.conf nginx:/etc/nginx/conf.d/loo.bloli.com.conf
docker exec nginx nginx -t
```

```bash
docker exec nginx nginx -s reload
curl -I http://loo.bloli.com/
curl --fail -I https://loo.bloli.com/
```

Expect HTTP to redirect to HTTPS. The final HTTPS request requires a running app gateway. Do not use `curl -k` for certificate acceptance checks.

## 6. Activate automatic renewal and Docker reload

Use the existing Snap timer; do not add another scheduler. First save this hook locally on the host as `50-loo-nginx-reload`:

```sh
#!/bin/sh
set -eu

# Scope this new hook to the app certificate, leaving other lineages alone.
case " ${RENEWED_DOMAINS:-} " in
    *" loo.bloli.com "*) ;;
    *) exit 0 ;;
esac

/usr/bin/docker exec nginx nginx -t
/usr/bin/docker exec nginx nginx -s reload
```

Install it into Certbot's deploy-hook directory and ensure the existing timer is active:

```bash
sudo install -m 0755 50-loo-nginx-reload /etc/letsencrypt/renewal-hooks/deploy/50-loo-nginx-reload
sudo systemctl enable --now snap.certbot.renew.timer
systemctl list-timers --all snap.certbot.renew.timer
```

The timer checks regularly; Certbot renews only when due. The hook runs after successful renewal and tests/reloads Nginx inside Docker so it reads the new certificate. A failed configuration check prevents reload and must be investigated in the journal.

Test just this lineage against the staging CA, including the deploy hook:

```bash
sudo /snap/bin/certbot renew --cert-name loo.bloli.com --dry-run --run-deploy-hooks
sudo journalctl -u snap.certbot.renew.service -n 80 --no-pager
```

The dry run performs validation and reloads Nginx using the current live certificate; it does not replace it with a staging certificate. A broad `renew --dry-run` will also encounter the unrelated failing domains already noted. A manual CLI test writes its details to `/var/log/letsencrypt/letsencrypt.log`; the systemd journal covers timer-driven runs.

### Existing duplicate schedulers

After validating the new lineage and auditing existing certificate coverage, consolidate on Snap. This is a separate planned operational change, not something applied during inspection:

```bash
sudo systemctl disable --now certbot.timer
sudo crontab -e
```

In root crontab, review the observed monthly `certbot renew --quiet --deploy-hook ...` entry before removing it. Its reload behavior may still be needed for other sites: move equivalent tested deploy hooks into the shared hook directory for those lineages before deleting it. Do not replace the entire crontab or alter unrelated jobs. Keep the Snap renewal timer enabled. Do not hand-edit existing renewal files or delete certificates to suppress failures.

## Troubleshooting and rollback

- Challenge 404: verify the new virtual host was loaded, correct DNS, port 80, and the exact webroot/mount mapping. Do not use standalone validation while Docker Nginx owns port 80.
- App 502: check app readiness, both gateway/proxy membership in `nginx_default`, alias `find-a-loo-web`, port 80, and internal API routes.
- Renewed certificate not served: inspect hook permissions, domain match, Certbot logs and `nginx -t`; test the publicly served certificate with SNI from outside the host.
- Syntax check fails after installing a file: do not reload or restart the container. Restore the prior copy (or the bootstrap config), retest, then reload. If removing a newly added virtual host, move it outside the `*.conf` include pattern. Running workers continue using their previous configuration until a successful reload.
- Backups: retain the config snapshot, app Compose/configuration, and a secure backup of all `/etc/letsencrypt`, preserving symlinks and permissions. Certificates include private keys: do not commit or copy them into this repository.
- Stopping or recreating the shared Nginx can affect all sites. These instructions use configuration reloads and do not require recreation of the existing proxy.

## Sources

- [Certbot webroot, renewals, deploy hooks, and dry runs](https://eff-certbot.readthedocs.io/en/stable/using.html)
- [Let's Encrypt HTTP-01 validation](https://letsencrypt.org/docs/challenge-types/)
- [Nginx proxy_pass and resolver behavior](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
