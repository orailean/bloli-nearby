# Cloudflare Web Analytics

The eight public Bloli Nearby sites include the supplied Cloudflare Web Analytics beacon, with a separate token for each hostname. Configuration lives alongside each site's metadata in [`scripts/build-site-shells.mjs`](../../scripts/build-site-shells.mjs).

| Hostname            | Beacon token                       |
| ------------------- | ---------------------------------- |
| `loo.bloli.com`     | `e801fcd3a63d4dab89cdf795c0c065df` |
| `kippe.bloli.com`   | `a88104d9b5474836b0b83c7c3040667a` |
| `kebab.bloli.com`   | `8c9c02f97f134755a37d8e278a57fa17` |
| `water.bloli.com`   | `a851083a4af84e56a8a4ddbf1952ffaf` |
| `transit.bloli.com` | `f7546bb7f5844f3a8e881c5860103442` |
| `charge.bloli.com`  | `6d0915767d0c4e79ade418897dcc12ff` |
| `atm.bloli.com`     | `19d2b3ccec7048d5a752c81573edef0b` |
| `stay.bloli.com`    | `4f5af3ea8f3642c4a6904f61fafe2018` |

These are public browser beacon identifiers, visible in page source, rather than Cloudflare account API credentials.

## How it is included

`npm run build` runs Vite and then the shell generator. The generator inserts one script immediately before `</body>` in each `dist/index-<site>.html`:

```html
<!-- Cloudflare Web Analytics -->
<script
  type="module"
  src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token":"SITE_TOKEN"}'
></script>
<!-- End Cloudflare Web Analytics -->
```

[`docker/gateway.conf`](../../docker/gateway.conf) selects the generated shell from the request hostname, including for application fallback routes. Each shell therefore carries only its own token. The source `index.html` and generic `dist/index.html` contain no beacon, so native Vite development does not send analytics through this integration. Serving a generated site shell during a production preview does load its beacon.

The integration loads the supplied browser beacon; it does not add custom events or explicitly send search coordinates. The shared privacy text in German, English, Romanian and Hungarian discloses Cloudflare Web Analytics usage for visits and site performance.

## Deploy and verify

Follow the [production update procedure](production-updates.md) to deliver the change. For an already updated VM checkout, this frontend-only change needs the web image rebuilt and recreated:

```bash
scripts/compose.sh build web
scripts/compose.sh up -d --wait --wait-timeout 180 web
```

No database migration or OSM refresh is needed. This repository change alone does not update the live websites.

After deployment, view page source for each hostname and check the script's token against the table. In browser developer tools, confirm that `beacon.min.js` loads and inspect its analytics requests; then check the corresponding site in Cloudflare Web Analytics. An extension or browser privacy setting may block those requests. If Cloudflare is also configured to inject a beacon automatically, check the delivered page for duplicate injection and use a single installation method.

There is no Content Security Policy in the current application gateway. If one is added, account for the beacon script at `https://static.cloudflareinsights.com` and its reporting requests when setting `script-src` and `connect-src`.

## Maintenance and local checks

To replace a token, change `analyticsToken` for the matching profile, update this table and its expected value in `tests/analytics-shells.test.ts`, then rebuild and redeploy the web image. A future site needs its own assigned token; do not reuse one of these by default.

```bash
node --import tsx --test tests/analytics-shells.test.ts
npm run build
```

The focused regression check runs the actual shell generator in a temporary directory and checks all eight token assignments, one beacon per shell, isolation between sites and the absence of analytics in the shared development template.
