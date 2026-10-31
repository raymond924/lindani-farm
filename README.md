# Lindani Farm website

The live website for Lindani Farm (https://lindanifarm.co.za), four self-catering units in
Klein-Drakenstein, Paarl.

## Hosting: Cloudflare Pages

Cloudflare Pages publishes this repository automatically on every push to `main`. Project settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `public` |
| Root directory | *(empty)* |

`public/_redirects` (old-site addresses) and `public/_headers` (security and caching) are read by
Cloudflare. Bookings go to NightsBridge and messages to WhatsApp or email, so the site needs no
server functions; the `/admin` dashboard and `netlify/` functions only run on Netlify.

## Files

- `public/`: the website (pages, styles, scripts, photos, `_redirects`, `_headers`, sitemap, robots)
- `netlify/`: booking functions (requests, dashboard, availability)
- `netlify.toml`: settings if the site is ever hosted on Netlify again
- `ghl/`: the GoHighLevel version, one block of code per page (see `ghl/README.md`)

This repository is generated from the source project; edit the source, not these files.
