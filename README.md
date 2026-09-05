# SmartDrive — Codex development copy

An independent copy of the Google AI Studio source. Frontend design, routes, business logic, React/Vite/Tailwind architecture, and Gemini scanning are retained. Codex is the development environment; no OpenAI API key is required.

## Run locally

1. Use Node.js 24.
2. Run `npm ci --ignore-scripts`.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` or `.env.local`. This local copy already has the existing project's configuration.
4. Run `npm run dev`, then open `http://localhost:3000`.

The existing authenticated Supabase `receipt-ocr` function provides Gemini receipt and dashboard scanning. Its credentials stay in the existing backend. The optional local Express OCR endpoint can use the original Gemini environment variable when configured; otherwise the existing client falls back to Supabase.

## Check and build

```sh
npm run lint
npm exec vite build
```

Vercel uses the static Vite build and the existing SPA route rewrite. The original `npm run build` script is retained for the Express deployment variant.

## Deployment

- Live clone: https://smartdrive-codex.vercel.app/login
- Clone Vercel project: `smartdrive-codex`
- Team: `ecatiktok002-1849s-projects`
- Supabase: existing `SAAS DATABASE` project, `czurhanyrjgeicnbrnev`
- Existing production app: `smartdrive.space`, Vercel project `saas-eca-fleet` — do not deploy the clone there.

The clone and original share accounts, bookings, files, and all other Supabase records. Saving or deleting a record in either app affects the same backend.

Builds require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. Keep secrets, `.env*`, logs, and `.migration` artifacts private. No Supabase schema or Edge Function deployment is needed.

After verifying `.vercel/project.json` points to the clone, deploy with:

```sh
npx vercel --prod --yes
```

Open this directory in Codex for future work. The sibling `ECA SAAS` directory is the original and has not been edited.

## GitHub and ongoing development

Repository: https://github.com/ecatiktok002-commercial/SAAS-ECA-FLEET

The existing `main` branch already deploys to `smartdrive.space` through the `saas-eca-fleet` Vercel project. A domain transfer is not required to replace AI Studio with Codex as the development tool.

Migration setup is prepared on `codex/original-layout-migration`. It retains the original application source and Gemini OCR, records the tested Vite deployment configuration and dependency lockfile, and excludes local environment files, diagnostic logs and Supabase CLI temporary files from new commits. Local copies remain available; existing Git history is preserved.

Baseline tag: `migration/original-layout-baseline-2026-09-05` at commit `f4bad2c0c5c8206420c288b639f5c0dded8688ee`.

For future work, create a feature branch in Codex, review its changes, run `npm run lint` and `npm exec vite build`, then push the branch for review. Merging into `main` triggers the existing production deployment. Review changes before merging because both applications share the production backend.

Keep the retained Gemini API credentials and Google Cloud project active. Stop making or syncing application changes from AI Studio once Codex becomes the source of future edits. The separate experimental redesign is not part of this repository migration.
