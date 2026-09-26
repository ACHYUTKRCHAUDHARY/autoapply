# Staging browser verification

Use a dedicated staging deployment and Supabase project with `supabase/schema.sql` applied, Gemini configured and an otherwise empty `jobs` table. Never aim this destructive test at production. It creates two confirmed test users, one shared job, exercises AI calls and deletes its test data in cleanup. The job URL points to example.com; it does not submit an application.

Set GitHub Actions repository secrets `E2E_BASE_URL` (staging origin), `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` and `STAGING_SUPABASE_SERVICE_ROLE_KEY`. Run the **Staging end-to-end** workflow manually. Its browser trace is attached on failure.

For a local staging run, configure the same environment names consumed by the test, set `E2E_STAGING_CONFIRM=staging`, run `npx playwright install chromium`, then `npm run test:e2e`. Keep the service key outside the web app and browser; the test uses it in Node only for fixtures and cleanup.

The journey covers login redirect, private DOCX extraction, Gemini parsing and matching, RLS isolation between two accounts, review notification, manual approval and submission tracking, follow-up and outreach drafts, analytics and workspace deletion. It relies on a single seeded job to avoid nondeterministic candidates. Check PDF, malformed uploads, job-source failure and mobile accessibility separately using the launch checklist.
