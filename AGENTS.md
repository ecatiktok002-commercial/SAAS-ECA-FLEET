# SmartDrive clone

This is the separate Codex development copy of the user's Google AI Studio project.

- Work in this directory. Do not modify the original sibling `ECA SAAS` directory.
- Preserve the existing frontend design, routes, components, business rules, and architecture unless the user requests a change.
- The user chose to retain Gemini OCR. No OpenAI API key or model migration is required.
- Supabase is the existing shared production backend (`czurhanyrjgeicnbrnev`). Both apps use the same records. Prefer read-only verification; do not run data repair scripts, migrations, cleanup jobs, or deploy Edge Functions as part of routine testing.
- The existing `saas-eca-fleet` Vercel project and `smartdrive.space` domain belong to the original app. Deploy this clone only through its own `.vercel/project.json` linkage.
- Use `npm ci --ignore-scripts` to install dependencies and `npm exec vite build` for the static Vercel build. The original `npm run dev` Express/Vite development workflow remains available.
- Keep `.env*`, diagnostic logs, and `.migration` artifacts private. Never put service-role or AI provider secrets in frontend environment variables.
