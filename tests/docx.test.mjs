import test from 'node:test';
import assert from 'node:assert/strict';
import mammoth from 'mammoth';
import { docx } from './fixtures.mjs';

test('generated DOCX fixture yields real resume text', async () => {
  const buffer = await docx();
  const { value } = await mammoth.extractRawText({ buffer });
  assert.match(value, /TypeScript Next\.js Supabase developer/);
});

test('malformed DOCX cannot extract text', async () => {
  await assert.rejects(() => mammoth.extractRawText({ buffer: Buffer.from('PK\x03\x04garbage') }));
});
