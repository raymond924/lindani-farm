# Lindani Farm website

The live website for Lindani Farm (https://lindanifarm.co.za), four self-catering units in
Klein-Drakenstein, Paarl.

## Hosting: Render (free static site)

Render publishes this repository automatically on every push to `main`. It is set up from
`render.yaml` (in Render: New > Blueprint > connect this repository):

- publishes `public/`, nothing to build
- short page addresses (`/studios` serves `studios.html`) and the site's own 404 page
- redirects from old-site addresses, and security and caching headers

Bookings go to NightsBridge and messages to WhatsApp or email, so the site needs no server
functions; the `/admin` dashboard and `netlify/` functions only run on Netlify.
`public/_redirects` and `public/_headers` hold the same rules for Netlify or Cloudflare Pages.

## Files

- `render.yaml`: Render settings (generated; edit `netlify.toml` in the source project)
- `public/`: the website (pages, styles, scripts, photos, `_redirects`, `_headers`, sitemap, robots)
- `netlify/`: booking functions (requests, dashboard, availability)
- `netlify.toml`: settings if the site is ever hosted on Netlify again
- `ghl/`: the GoHighLevel version, one block of code per page (see `ghl/README.md`)

This repository is generated from the source project; edit the source, not these files.
