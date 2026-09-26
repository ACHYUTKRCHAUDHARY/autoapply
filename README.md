# AutoApply

An editorial job-search workspace built with Next.js 14 App Router, TypeScript, Supabase, Gemini and a separate Playwright worker. A match above 70% creates a draft for review. **The web app never submits an application.** Users open the posting and submit themselves, then record the result.

## Setup

1. `npm install`, copy `.env.example` to `.env.local`, then fill the Supabase URL, anon key, service role key, Gemini key, Adzuna credentials, JSearch RapidAPI key and a random `CRON_SECRET`. Never expose server keys with `NEXT_PUBLIC_`.
2. For a new project, run `supabase/schema.sql` in the Supabase SQL editor. For an existing database initialized before Phase 3, run `supabase/migrations/20260926_phase3.sql` followed by `supabase/migrations/20260926_phase4.sql`. The latter adds private resume deletion and workspace erasure.
3. Set the same environment variables on Vercel. Deploy the Next.js root directory. Run `npm run dev` locally.
4. To load jobs locally, call `GET /api/jobs/sync` with `Authorization: Bearer <CRON_SECRET>`. Vercel Hobby runs the configured cron daily. For more frequent syncs, configure an external scheduler such as cron-job.org to call the same authenticated route.
5. Create an account, upload a text-based PDF or DOCX, and choose **Find matches**. Each run processes at most three jobs. Gemini calls use the shared `runJSON` queue and an atomic database slot (~13.6 req/min across instances); no direct SDK calls bypass it. A two-minute per-user lease rejects overlapping runs and eventually expires after a crash. Drafts and in-app alerts are created in one database transaction. You can edit a draft before submission; editing an approved draft returns it to pending review.

## Routes and features

| Feature | Files |
| --- | --- |
| Resume extraction and profile parsing | `src/app/api/resume/extract/route.ts`, `src/app/api/resume/parse/route.ts`, `src/app/profile/page.tsx` |
| Shared job cache and matching | `src/lib/jobSources.ts`, `src/app/api/jobs/{sync,match}/route.ts`, `src/lib/gemini.ts` |
| Human approval and application tracker | `src/app/api/applications/[id]/route.ts`, `src/components/ApplicationCard.tsx`, `src/app/applications/page.tsx` |
| Follow-up and warm outreach | `src/app/api/applications/[id]/{follow-up,outreach}/route.ts`, `src/components/ApplicationCard.tsx` |
| Outcome analysis | `src/lib/analytics.ts`, `src/app/analytics/page.tsx` |
| In-app review alerts | `src/app/notifications/page.tsx`, `src/app/api/notifications/[id]/route.ts`, `supabase/schema.sql` |
| Portal form proof of concept | `worker/apply-worker.ts` |
| Phase 3 matching lease and quota | `supabase/migrations/20260926_phase3.sql`, `src/lib/gemini.ts`, `src/app/api/jobs/match/route.ts` |
| Editable drafts | `src/components/DraftEditor.tsx`, `src/app/api/applications/[id]/draft/route.ts` |

The Greenhouse worker runs separately (`cd worker && npm install && npx playwright install chromium && npm start`). Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_TOKEN` and `PORT` on Render. It accepts an authenticated `POST /preview-application` with an approved `applicationId`, fills a verified `boards.greenhouse.io` form, closes the browser and returns without submitting. It is a handler proof of concept, not a usable interactive submission flow. Its selectors are examples: check a live posting and terms of service before using it. Never put the worker token or service role key in the browser.

Read [product requirements](docs/product-requirements.md) and the [launch checklist](docs/launch-checklist.md) before enabling public onboarding. Resume uploads go directly from the browser to private Supabase Storage so the 5 MB limit does not depend on a Vercel Function request body.

## Checks

`npm run typecheck`, `npm test`, `npm run build`; run `npm run typecheck` in `worker` too. Live Supabase, Gemini and job-source integration require configured credentials and are not mocked as passing.
