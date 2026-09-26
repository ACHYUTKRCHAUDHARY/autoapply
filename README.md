# AutoApply

An editorial job-search workspace built with Next.js 14 App Router, TypeScript, Supabase, Gemini and a separate Playwright worker. A match above 70% creates a draft for review. **The web app never submits an application.** Users open the posting and submit themselves, then record the result.

## Setup

1. `npm install`, copy `.env.example` to `.env.local`, then fill the Supabase URL, anon key, service role key, Gemini key, Adzuna credentials, JSearch RapidAPI key and a random `CRON_SECRET`. Never expose server keys with `NEXT_PUBLIC_`.
2. Run `supabase/schema.sql` in the Supabase SQL editor. This creates the private `resumes` bucket, user tables, RLS, and atomic review functions.
3. Set the same environment variables on Vercel. Deploy the Next.js root directory. Run `npm run dev` locally.
4. To load jobs locally, call `GET /api/jobs/sync` with `Authorization: Bearer <CRON_SECRET>`. Vercel Hobby runs the configured cron daily. For more frequent syncs, configure an external scheduler such as cron-job.org to call the same authenticated route.
5. Create an account, upload a text-based PDF or DOCX, and choose **Find matches**. The Gemini calls use one ~13.6 req/min process queue. Each click scores at most three new jobs to fit a short request. On Vercel, separate instances do not share this in-memory limiter; use a distributed quota if multiple concurrent users must be supported reliably.

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

The Greenhouse worker runs separately (`cd worker && npm install && npx playwright install chromium && npm start`). Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_TOKEN` and `PORT` on Render. It accepts an authenticated `POST /preview-application` with an approved `applicationId`, fills a verified `boards.greenhouse.io` form, closes the browser and returns without submitting. It is a handler proof of concept, not a usable interactive submission flow. Its selectors are examples: check a live posting and terms of service before using it. Never put the worker token or service role key in the browser.

## Checks

`npm run typecheck`, `npm test`, `npm run build`; run `npm run typecheck` in `worker` too. Live Supabase, Gemini and job-source integration require configured credentials and are not mocked as passing.
