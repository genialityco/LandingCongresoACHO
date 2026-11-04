# Landing Congreso ACHO

## Build, test, and lint

Install dependencies with `npm ci`.

- `npm run dev` starts the Next.js development server.
- `npm run build` creates the production build; `npm run start` serves it.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run test` runs the unit tests under `tests/unit`.
- `npm run test:firebase` starts Firebase Auth, Firestore, and Storage emulators and runs the rules and integration tests.
- `npm run test:e2e` runs Playwright against the local app. Start fresh emulators with `npm run emulators:fresh`, seed users with `npm run emulators:users`, and build first with `npm run build`.
- `npm run test:all` runs type-checking, unit tests, and emulator-backed tests.

Run one unit or integration test with Vitest, for example:

```bash
npx vitest run tests/unit/serialization.test.ts
npx vitest run tests/unit/serialization.test.ts -t "fragmenta por bytes UTF-8"
```

Rules and integration tests require the Firebase emulators. To target one of those files, use the same emulator wrapper as the package script:

```bash
firebase emulators:exec --only auth,firestore,storage --project demo-congresoacho "vitest run tests/rules/firestore.rules.test.ts -t \"lectura pública\""
```

To run one Playwright test, use `npx playwright test e2e/01-explore.spec.ts -g "login, demo"`.

## Architecture

- This is a Next.js App Router application. The public route at `src/app/[slug]/page.tsx` is a Server Component that reads only published Firestore data through `src/lib/public/load.ts`, renders it with `src/builder/render/PageRenderer.tsx`, and uses tagged Cache Components caching. Publishing calls `src/app/api/revalidate/route.ts` to invalidate the relevant page/settings tags.
- The admin area under `src/app/admin/` is client-side. `src/components/admin/auth.tsx` owns Firebase Auth state and custom-claim roles (`admin`, `editor`, `viewer`); `AdminShell` provides the guarded layout and navigation. Firestore and Storage rules remain the authorization boundary.
- Page editing uses Puck-shaped JSON (`PageData`). `src/builder/schema.ts` defines block metadata and slots, `src/builder/registry.ts` maps block types to the shared React implementations, and `PageRenderer` uses the same registry for previews and public rendering. `SharedBlock` content is resolved into the publish snapshot rather than fetched by public visitors.
- Firestore access is organized in `src/lib/services/`: `pages.ts` handles drafts, optimistic revision conflicts, versions, publishing, and unpublishing; `settings.ts` handles draft/public global settings; `media.ts` handles Storage uploads and media references. Firebase client/server initialization is separated under `src/lib/firebase/`.
- Page JSON is serialized by `src/lib/serialization/chunks.ts`. Documents at or below `MAX_CHUNK_BYTES` (700,000 UTF-8 bytes) stay inline; larger snapshots are stored as indexed chunks and reconstructed on read. Publishing writes the version, public snapshot, chunks, and page metadata in a transaction.

## Repository conventions

- Preserve the generated Next.js guidance in [AGENTS.md](../AGENTS.md). Before changing Next.js behavior or APIs, read the relevant guide under `node_modules/next/dist/docs/`; do not remove the generated block from `AGENTS.md`.
- Use the `@/*` TypeScript alias for `src/*`. Keep browser-only Firebase code in `"use client"` modules and public server reads in `"server-only"` modules; do not import the client Firebase singleton into public Server Components.
- Treat `PageData`, media references, and the block registry as serialized contracts. When adding or changing a block, update the schema metadata and registry together, preserve stable component `props.id` values, and ensure nested slots are handled by the shared traversal helpers in `src/lib/serialization/page-data.ts`.
- Save drafts through the page service so revision checks and chunk cleanup remain transactional. Do not write page/draft/version/public documents directly from UI components.
- Publishing must validate page structure, resolve shared blocks, verify every referenced media document, refresh media URLs while preserving author-provided alt text, and then write the public snapshot transactionally. Public pages must remain self-contained and must not read drafts.
- Keep Firestore and Storage rule changes covered by the emulator tests. Public Storage paths (`landing-pages`, `shared`, and `templates`) are intentionally readable without authentication; private files are not.
- Media filenames and upload limits must stay aligned across `src/lib/services/media.ts` and `storage.rules`; SVG is intentionally excluded.
- Responsive styling is desktop-first: tablet is `max-width: 1024px`, mobile is `max-width: 640px`; ordinary values inherit down through breakpoints, while visibility uses exclusive device ranges. User-provided CSS values must pass the sanitization helpers in `src/builder/styles/css.ts`.
- Keep UI text and test names consistent with the existing Spanish product language. Use the existing shadcn-style primitives in `src/components/ui/` and `cn` for class composition rather than introducing a second styling system.
