import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuthPresentation } from '../src/lib/auth-copy.ts';

test('login heading welcomes returning users', () => {
  const copy = getAuthPresentation('login');
  assert.match(copy.title, /กลับ/);
  assert.match(copy.description, /เข้าสู่ระบบ/);
});

test('registration heading describes creating a viewer account', () => {
  const copy = getAuthPresentation('register');
  assert.match(copy.title, /สร้างบัญชี/);
  assert.match(copy.description, /ผู้ชม/);
  assert.doesNotMatch(copy.title, /กลับ/);
});
