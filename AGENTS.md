# Repository Guidelines

## Project Structure & Module Organization
The Koishi plugin source lives in `src/`, with `index.tsx` providing the entry export, `core.tsx` hosting most runtime logic, and `model.ts` defining shared data helpers. Transpiled artifacts are checked into `lib/`; update them only via TypeScript builds. Compilation settings reside in `tsconfig.json`, while `.editorconfig` enforces shared formatting. Keep scratch data, screenshots, and experimental assets out of version control unless the release workflow demands them.

## Build, Test, and Development Commands
Install dependencies once per clone:
```bash
npm install
```
Build TypeScript before publishing or committing changes that affect runtime logic:
```bash
npx tsc --project tsconfig.json
```
For manual verification inside a Koishi app, link or copy the plugin and reload the bot:
```bash
koishi deploy --plugin ./external/msbot
```
Document any additional scripts you introduce in `package.json` so future contributors can rely on them.

## Coding Style & Naming Conventions
Use spaces with a two-character indent, LF line endings, and UTF-8 encoding as enforced by `.editorconfig`. Prefer double-quoted imports and keep Koishi `Schema` definitions readable by aligning nested objects and providing concise descriptions. Name exported handlers and schemas in PascalCase, internal utilities in camelCase, and constants in SCREAMING_SNAKE_CASE only when immutable. Add brief comments solely for non-obvious data flows or Koishi-specific workarounds.

## Testing Guidelines
Automated tests are not yet present; exercise new features by running the plugin inside a staging Koishi instance and verifying group messaging flows (MVP rotations, daily news, API pushes). When adding tests, mirror file names (for example, `core.spec.ts`) and place them alongside the modules they cover. Aim for coverage on schema validation and message formatting to prevent regressions in production bots.

## Commit & Pull Request Guidelines
Recent history favors short, Chinese-language summaries that begin with the phonetic pattern `xiugai ...` ("modify ..."). Continue with brief, action-focused subjects that highlight the primary change. For pull requests, include: a problem statement, a concise overview of the solution, manual test evidence (logs or screenshots), and links to related Koishi issues or discussions. Request review before merging and ensure the TypeScript build output in `lib/` is in sync with the `src/` sources.
