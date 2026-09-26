import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { docx } from '../fixtures.mjs';
import { randomUUID } from 'node:crypto';

const baseURL = process.env.E2E_BASE_URL;
const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = !!(baseURL && supabaseURL && anonKey && serviceKey && process.env.E2E_STAGING_CONFIRM === 'staging');
test.use({ baseURL });
test.setTimeout(240_000);

const suffix = randomUUID();
const email = `autoapply-e2e-${suffix}@example.invalid`;
const otherEmail = `autoapply-e2e-other-${suffix}@example.invalid`;
const password = `E2e!${randomUUID()}`;
const admin = enabled ? createClient(supabaseURL, serviceKey, { auth: { persistSession: false } }) : null;
const createdUsers = [];
let jobId;



test.beforeAll(async () => {
  if (!enabled) return;
  for (const address of [email, otherEmail]) {
    const { data, error } = await admin.auth.admin.createUser({ email: address, password, email_confirm: true });
    if (error) throw error;
    createdUsers.push(data.user.id);
  }
  const { data, error } = await admin.from('jobs').insert({ source: 'e2e', source_id: suffix, title: 'TypeScript Next.js Supabase developer', company: 'AutoApply test company', location: 'Remote', job_type: 'Remote full time', description: 'Seeking a TypeScript Next.js React Supabase PostgreSQL developer with five years software engineering experience to build job search apps.', url: 'https://example.com/jobs/e2e' }).select('id').single();
  if (error) throw error;
  jobId = data.id;
});

test.afterAll(async () => {
  if (!enabled) return;
  // Clean up test accounts and their private files even if an assertion fails.
  for (const id of createdUsers) {
    const { data } = await admin.storage.from('resumes').list(id, { limit: 100 });
    if (data?.length) await admin.storage.from('resumes').remove(data.map(file => `${id}/${file.name}`));
    await admin.auth.admin.deleteUser(id);
  }
  if (jobId) await admin.from('jobs').delete().eq('id', jobId);
});

test.describe('configured staging project', () => {
  test.skip(!enabled, 'Set E2E_BASE_URL, staging Supabase credentials and E2E_STAGING_CONFIRM=staging to run.');
  test('private resume to review, manual submission, outreach and deletion', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/profile');
  await page.getByLabel(/I understand AutoApply/).check();
  await page.getByLabel('Upload resume').setInputFiles({ name: 'resume.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await docx() });
  await expect(page.getByRole('status')).toContainText('Resume saved', { timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Download my resume' })).toBeVisible();
  await page.getByLabel('Search keywords').fill('TypeScript Next.js');
  await page.getByLabel('Preferred location').fill('Remote');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Preferences saved');

  const other = createClient(supabaseURL, anonKey, { auth: { persistSession: false } });
  const { error: signinError } = await other.auth.signInWithPassword({ email: otherEmail, password });
  expect(signinError).toBeNull();
  const { data: privateRows } = await other.from('profiles').select('user_id').eq('user_id', createdUsers[0]);
  expect(privateRows).toEqual([]);
  const { data: privateFile } = await other.storage.from('resumes').list(createdUsers[0]);
  expect(privateFile || []).toEqual([]);

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Find matches' }).click();
  await expect(page.getByRole('status')).toContainText('1 jobs scored', { timeout: 90_000 });
  await expect(page.getByRole('status')).toContainText('1 new drafts ready');
  await page.goto('/notifications');
  await expect(page.getByText('Applications ready for review')).toBeVisible();
  await page.getByRole('button', { name: 'Mark read' }).click();
  await expect(page.getByText(/^Read ·/)).toBeVisible();

  await page.goto('/applications');
  await expect(page.getByText('TypeScript Next.js Supabase developer')).toBeVisible();
  const { data: before } = await admin.from('applications').select('status,submitted_at').eq('user_id', createdUsers[0]).single();
  expect(before).toMatchObject({ status: 'pending_review', submitted_at: null });
  await page.getByRole('button', { name: 'approved', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark submitted' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Mark submitted' }).click();
  await expect(page.getByRole('button', { name: 'Draft follow-up' })).toBeVisible();
  await page.getByRole('button', { name: 'Draft follow-up' }).click();
  await expect(page.getByLabel('Follow-up draft')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Draft outreach' }).click();
  await expect(page.getByLabel('Outreach draft')).not.toBeEmpty();
  await expect(page.getByRole('link', { name: /Find recruiter on LinkedIn/ })).toHaveAttribute('href', /linkedin\.com\/search/);
  await page.goto('/analytics');
  await expect(page.getByText('Remote full time')).toBeVisible();

  await page.goto('/profile');
  await page.getByLabel('Confirmation').fill('DELETE');
  await page.getByRole('button', { name: 'Delete workspace data' }).click();
  await expect(page.getByRole('status')).toContainText('Workspace data deleted');
  const { data: after } = await admin.from('applications').select('id').eq('user_id', createdUsers[0]);
  expect(after).toEqual([]);
});

});
