# timrumboll.com — Jekyll source

A fast, static Jekyll rebuild of the site, with a Decap CMS admin panel
so you can add projects and notes without hand-editing Markdown or
manually FTPing files.

## Structure

- `_data/showreels.yml` — the 4-5 reels shown on the homepage
- `_projects/` — one file per project, shown on `/projects/` and the
  homepage "recent projects" list
- `_notes/` — blog-style posts, shown on `/notes/`
- `about.md` — simple content page
- `_data/contact.yml` — contact details shown in the homepage's `#contact` section
- `assets/audio/` — put your real MP3 files here
- `admin/` — the Decap CMS panel (lives at `yoursite.com/admin`)
- `.github/workflows/deploy.yml` — builds the site and FTPs it to your
  cPanel hosting on every push to `main`

## Run locally

```
bundle install
bundle exec jekyll serve
```

Then visit http://localhost:4000

Note: `Gemfile` pins `jekyll-sass-converter` to v2 (the `sassc`-based
converter) rather than the default `sass-embedded`, since the latter
ships a compiled Dart runtime that crashes on some older macOS
versions. If you ever see a `Conversion error` mentioning
`sass-embedded` or `Dart_Isolate`, check this pin is still in place.

## Adding content without the CMS (for now)

- New project: copy a file in `_projects/`, edit the front matter
  (client, sector, date, excerpt, audio, duration) and write the body.
- New note: copy a file in `_notes/`, same idea.
- New/changed showreel: edit `_data/showreels.yml`.
- Drop matching MP3s into `assets/audio/`.

Commit and push to `main` — the GitHub Action builds and deploys
automatically. No local build or manual FTP needed once this is set up.

## One-time setup still needed

1. **Create a GitHub repo** and push this folder to it.
2. **Add FTP secrets** in the repo's Settings > Secrets and variables >
   Actions: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (from your
   cPanel hosting). Check `server-dir` in `deploy.yml` matches your
   actual web root (often `public_html/`).
3. **Wire up the CMS admin panel** (`/admin`) so you can edit content
   from a browser instead of git:
   - Update `admin/config.yml` — set `repo` to `your-username/your-repo`.
   - Decap CMS needs an OAuth step to confirm you're allowed to save
     changes to the repo. The simplest free route is a small hosted
     OAuth proxy for GitHub — Netlify's free tier works well for just
     this piece even though the site itself is hosted elsewhere.
     Follow Decap's "GitHub backend" docs for the exact steps:
     https://decapcms.org/docs/github-backend/
4. **Add real audio files** to `assets/audio/`, replacing the
   placeholder filenames in `_data/showreels.yml` and each project's
   front matter.
5. **Replace placeholder contact details** in `_data/contact.yml`.
6. **Add a favicon** at `assets/images/favicon.png`.

## Design notes

Dark, "on-air" studio aesthetic — amber tally-light accent, Fraunces
for headlines, Inter for body copy, IBM Plex Mono for meta labels
(durations, dates, categories). All defined as CSS variables at the
top of `assets/css/style.scss` if you want to adjust the palette.
