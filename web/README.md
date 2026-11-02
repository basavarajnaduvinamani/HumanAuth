# HumanAuth web

Next.js browser application; inference runs locally in a worker. Use Node 24
and Python 3.11 for model export. See [architecture and reproduction](../docs/web.md)
and [model manifest](public/models/manifest.json).

Qualified release models are included. To reproduce them, install the Python
export dependencies and run `python scripts/export_web_models.py` from the
repository root. For normal web development:

```powershell
cd web
npm ci
node scripts/copy-runtime.mjs
npm run dev
```

Production and checks:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

In another terminal, `npx playwright install chromium firefox webkit` then
`npm run e2e`. Set `BASE_URL` to test another running build. The test records
request summaries without media and asserts same-origin static GET requests,
zero upload bodies, a media-free receipt and no serious/critical axe findings.

No `.env` or API key is needed. Start over clears the session; models remain
cached. The document sample deliberately produces a rejection. The only bundled
voice recording is the existing Raj test clip; Sahana is an enrolled comparison
identity, with no new recording distributed. Live matching is closed-set and
does not detect synthetic voice or reject unknown speakers reliably.
