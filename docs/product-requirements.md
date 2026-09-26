# AutoApply · Product requirements

## Product promise

Help an individual job seeker discover relevant openings, prepare accurate application material, and track outcomes in one private workspace. The user remains the final decision maker: the web app does not send messages, click submit, or apply without a person opening the posting and completing the submission.

## Audience and core jobs

- **First-time applicant:** upload a resume, set target roles, understand what to do next.
- **Active applicant:** find and filter matches, read fit reasoning, edit a draft, approve it, then submit on the employer site and record the outcome.
- **Returning applicant:** see pending reviews and in-app updates, draft a follow-up, inspect response/interview rates by score, location and type.

## Release scope and acceptance criteria

| Area | User requirement | Acceptance check |
| --- | --- | --- |
| Account | Email/password sign-in with protected pages | Anonymous requests redirect to login; APIs verify the user again; another user cannot read a private row. |
| Resume | Private PDF/DOCX upload, 5 MB limit | Browser uploads to Supabase Storage; server validates path, size, signature and extractable text; prior resume can be downloaded. |
| Consent | AI processing is explicit | Upload control stays disabled until user acknowledges Gemini processing; generated text is labelled as a draft. |
| Jobs | Adzuna/JSearch cache with daily sync | Cron requires bearer secret; source failure is visible; shared jobs are read-only to users. |
| Matching | Fit score and honest reasoning | Three candidates per run; paginates beyond the initial cache page; interrupted high-score drafts can retry; overlapping runs conflict. |
| Quota | Gemini free-tier protection | Every Gemini operation uses `runJSON`; a shared database slot spaces requests across instances and fails closed if unavailable. |
| Review | Human gate | Draft starts pending; editing approved material returns it to pending; only a valid status transition succeeds; submission is recorded manually. |
| Outreach | Draft and search link | Text can be copied; LinkedIn search opens separately; no LinkedIn account automation. |
| Analytics | Outcomes with context | Submitted applications form the denominator; historical viewed/interview events remain counted after a later rejection; empty cohorts do not divide by zero. |
| Updates | In-app reminders | A newly created draft and its notification commit together; user can mark notification read. No email is sent. |
| Privacy | Control stored data | Resume can be downloaded; typed confirmation removes workspace data and private files while leaving the login account active. |
| Usability | Clear first-run experience | Dashboard shows next action, blocked match reason, queue count and job cache state; pages have loading, error and empty states; navigation works on mobile and by keyboard. |

## Nonfunctional requirements

- **Authorization:** RLS on user tables and storage; `auth.uid()` validated inside definer functions; service role only in cron and isolated worker.
- **Input handling:** validate mutation payloads and file content on the server; reject cross-site mutation Origins; never put secrets into browser bundles.
- **Performance:** cap AI work per request, paginate matches, avoid uploading 5 MB through Vercel Functions.
- **Reliability:** recover a matching lease after a crash; retry unfinished drafts; treat external source failures separately.
- **Accessibility:** semantic headings, labels, focus indicators, skip link, keyboard navigation and status messages.
- **Observability:** build and test in CI; runtime errors show a safe retry view without leaking internal details.

## Explicit limits

- Scores are AI-assisted estimates, not guarantees of interview or hiring.
- Text-based PDFs work; image-only scans need OCR, which is outside this release.
- The Greenhouse handler is a selector proof of concept. It closes without submission; selectors and portal terms require live verification.
- Real Supabase, Gemini, job-source and Vercel/Render behavior must be checked with configured credentials before a production launch claim.

## Release gates

1. CI: tests, TypeScript checks and Next production build pass; production dependency audit has no unresolved high/critical issues.
2. Database: run SQL in a staging Supabase project; test RLS with two users, status transitions, quota reservation and deletion.
3. Browser: exercise signup, PDF/DOCX upload, match, edit/approve, mark submitted, follow-up, notifications and deletion at desktop/mobile widths.
4. Operations: configure all secrets, cron, domain, monitoring and rollback; verify external API quotas and error messages.
5. Privacy: publish a real privacy notice and retention policy before public onboarding. The UI disclosure alone is not a legal policy.

**Current launch blocker (26 September 2026):** the locked Next.js 14 dependency is flagged by `npm audit --omit=dev --audit-level=high` for high/critical advisories, with no patched 14.x release offered in the audit. Do not describe this build as security-cleared until the version constraint is revisited and a supported version is migrated and verified.
