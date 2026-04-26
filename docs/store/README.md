# Store listing pages (GitHub Pages)

Static **HTML** for **App Store Connect** and **Google Play** URLs:

| Page | Purpose |
|------|---------|
| [support.html](./support.html) | **Support URL** — contact + FAQ |
| [privacy.html](./privacy.html) | **Privacy Policy URL** |
| [index.html](./index.html) | Short hub (optional marketing link) |

## Is GitHub Pages enough?

**Yes** for typical listings: Apple and Google need **stable `https://` URLs** that return real pages. GitHub Pages on a **public** repository is free and standard for indie apps.

**Before you rely on it:**

- **Contact / policy** in `support.html` and `privacy.html` are set to **Aman Shrivastava**, **aman.srivastava999@gmail.com**, last updated **April 25, 2026** — edit when your details change.
- **Private repos:** GitHub Pages on private repos may require a **paid** GitHub plan (policy changes over time—check [GitHub Pages docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). Easiest path: **public repo** or use **Cloudflare Pages** / **Netlify** with the same HTML.

## Enable GitHub Pages (project site from `/docs`)

1. Push this repo to GitHub (if it is not already).
2. On GitHub: **Settings** → **Pages** (left sidebar).
3. Under **Build and deployment** → **Source**: choose **Deploy from a branch**.
4. **Branch**: `main` (or your default branch) → **Folder**: **`/docs`** → **Save**.

GitHub builds the site from the **`docs/` folder root**. Your store pages live under **`docs/store/`**, so after a minute the URLs will look like:

```text
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/store/index.html
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/store/support.html
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/store/privacy.html
```

Use **`…/store/support.html`** and **`…/store/privacy.html`** (full `https://` strings) in **App Store Connect** and **Play Console**.

For this repository (**`4m4n5/humm`**), after Pages is enabled, the URLs will be:

- `https://4m4n5.github.io/humm/store/support.html`
- `https://4m4n5.github.io/humm/store/privacy.html`
- `https://4m4n5.github.io/humm/store/index.html` *(optional hub)*

**Optional:** Use **`…/store/`** (trailing slash) only if you add a default document behavior you prefer; raw `support.html` / `privacy.html` links are clearest.

## `docs/.nojekyll`

The repo includes **`docs/.nojekyll`** so GitHub does not run **Jekyll** on the `docs/` tree (avoids odd processing of other `.md` files next to these HTML pages).

## Custom domain later

In **Pages** settings, add a custom domain (e.g. `humtum.app`) and follow GitHub’s DNS steps. Then update store consoles to the new URLs.

## Local preview

From repo root:

```bash
cd docs/store && python3 -m http.server 8765
```

Open `http://localhost:8765/support.html` and `privacy.html` to proofread.

## Automated check (Playwright)

From repo root (installs Chromium on first run via `npx playwright install chromium`):

```bash
npm run verify:store-pages
```

This serves `docs/store` locally and asserts the HTML/CSS load and key headings are present.
