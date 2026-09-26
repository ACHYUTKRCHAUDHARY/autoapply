# Launch checklist

## Configuration

- [ ] Create Supabase Auth project and run `supabase/schema.sql` on a new database, or apply Phase 3 then Phase 4 migrations to an existing Phase 2 database.
- [ ] Set Vercel variables from `.env.example`; keep service-role and API keys server-side.
- [ ] Configure Supabase Auth redirect URLs and production domain.
- [ ] Confirm Adzuna and JSearch credentials; call authenticated sync route once and inspect cached jobs.
- [ ] Set `CRON_SECRET` for Vercel daily cron. Use a free external scheduler if more frequent syncs are needed.
- [ ] Publish privacy notice, retention policy and support contact.

## Staging verification

- [ ] Sign in as user A and B; verify A cannot read B's profile, resume, matches, applications, events or notifications.
- [ ] Upload valid PDF and DOCX, malformed files, image-only PDFs, 0-byte and >5 MB files.
- [ ] Score enough jobs to pass page 1; verify no duplicates and a new draft notification.
- [ ] Start two match requests; confirm one returns conflict and the lease later recovers.
- [ ] Edit an approved draft; confirm pending status and logged event. Reject invalid transitions.
- [ ] Verify LinkedIn link only opens search and no messages are sent.
- [ ] Confirm analytics after viewed → rejected still counts a response.
- [ ] Download resume, then delete workspace with typed confirmation; confirm private files and user rows are gone.
- [ ] Inspect mobile, tablet, desktop, keyboard focus and screen-reader labels.

## Deploy and observe

- [ ] Review GitHub Actions result and Vercel preview build.
- [ ] Resolve the Next.js 14 high/critical dependency audit findings through an approved supported-version migration; rerun build, tests and audit.
- [ ] Set monitoring for Function errors and job-source failures; avoid logging resume text or secrets.
- [ ] Test daily cron and record last successful sync.
- [ ] Keep the Render worker private and unconnected to auto-submit until portal-specific selectors and policy are validated.
- [ ] Run a real end-to-end staging test before announcing production readiness.
