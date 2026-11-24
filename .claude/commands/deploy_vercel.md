---
description: Build the game and deploy it to Vercel as a static site (production)
---

Deploy this project to Vercel and report the live URL.

Scope: only the front-end game is deployed, as a static site. The Express + SQLite API server (`server/index.mjs`) is NOT deployed, because Vercel does not keep files between requests. On the live site, guest mode works and sign in / sign up / score history show a "cannot reach the server" error. Tell the user this in the final summary.

Steps:

1. Check the Vercel CLI works: run `npx vercel --version`. If it is not available, it will be downloaded by `npx`.
2. Check the user is logged in: run `npx vercel whoami`. If not logged in, stop and ask the user to run `! npx vercel login` themselves (it is interactive), then continue.
3. Build locally first to catch errors: `npm run build`. If it fails, stop and report the error. Do not deploy.
4. Make sure `vercel.json` exists in the project root, because the build output folder is `build`, not Vercel's default `dist`. If it is missing, create it with:

   ```json
   { "buildCommand": "npm run build", "outputDirectory": "build", "framework": "vite" }
   ```

   If it already exists but has different settings, show it to the user and ask before changing it.
5. Deploy to production: `npx vercel deploy --prod --yes`.
6. From the deploy output, find the production URL (the `Production:` line, or the project alias like `https://<project>.vercel.app`).
7. Report back in a short summary:
   - The live URL.
   - That only guest mode works online (no sign in / scores).
   - Any warnings from the build or deploy.

Do not commit, push, or change any other project files as part of this command.
