---
description: Push the project to GitHub and deploy the game to GitHub Pages
---

Push this project to a GitHub repository and deploy the game to GitHub Pages, then report the repo URL and the live URL.

Scope: only the front-end game is deployed, as a static site. The Express + SQLite API server (`server/index.mjs`) is NOT deployed, because GitHub Pages only serves static files. On the live site, guest mode works and sign in / sign up / score history show a "cannot reach the server" error. Tell the user this in the final summary.

Steps:

1. Check the GitHub CLI works and the user is logged in: run `gh auth status`. If `gh` is missing, stop and ask the user to install it (https://cli.github.com). If not logged in, stop and ask the user to run `! gh auth login` themselves (it is interactive), then continue.
2. Build locally first to catch errors: `npm run build`. If it fails, stop and report the error. Do not push or deploy.
3. Set up git:
   - If the folder is not a git repo, run `git init -b main`.
   - Run `git status` and check that no files that should stay private will be committed: `node_modules/`, `build/`, `server/data/` (the SQLite database), `.env*`, `.vercel/`, `.claude/settings.local.json`. `.gitignore` already covers most of these. If any of them would be committed, stop, show the user, and ask before changing `.gitignore`.
   - Show the user the list of files to be committed and ask them to confirm.
4. Commit: `git add -A`, then commit with a short message that describes the changes. End the message with the attribution line given in the conversation's system reminder, if there is one. If there is nothing to commit, skip this step.
5. Push to GitHub:
   - If there is no `origin` remote, ask the user for the repo name (suggest the folder name) and whether it should be public or private. Note: GitHub Pages on a private repo needs a paid GitHub plan. Then run `gh repo create <name> --<public|private> --source=. --remote=origin --push`.
   - If `origin` already exists, run `git push -u origin <current branch>`.
6. Build for GitHub Pages. The site is served from `https://<user>.github.io/<repo>/`, not from the root, so asset paths must be relative. Build with `npx vite build --base=./`. Do not change `vite.config.ts`.
7. Deploy the `build` folder to the `gh-pages` branch with the `gh-pages` package: `npx --yes gh-pages -d build -t`. (`-t` includes dotfiles. This only pushes the build output to the `gh-pages` branch. It does not change `main`.)
8. Turn on GitHub Pages for the `gh-pages` branch, if it is not on already:
   - Check: `gh api repos/{owner}/{repo}/pages`.
   - If it returns 404, enable it: `gh api -X POST repos/{owner}/{repo}/pages -f "source[branch]=gh-pages" -f "source[path]=/"`.
9. Get the live URL from `gh api repos/{owner}/{repo}/pages --jq .html_url`. The first deploy can take a minute or two to go live.
10. Report back in a short summary:
    - The GitHub repo URL and the live GitHub Pages URL.
    - That only guest mode works online (no sign in / scores).
    - That the first deploy can take a minute or two to appear.
    - Any warnings from the build, push or deploy.

Do not change any project source files as part of this command. Never force-push to `main`. Never delete branches or repositories.
