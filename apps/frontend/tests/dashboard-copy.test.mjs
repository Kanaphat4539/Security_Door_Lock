import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardPresentation } from '../src/lib/dashboard-copy.ts';

test('ADMIN sees operations copy and card-management action', () => {
  const view = getDashboardPresentation('ADMIN');
  assert.match(view.title, /ศูนย์ควบคุม/);
  assert.equal(view.showManagement, true);
  assert.match(view.notice, /สถานะประตู/);
});

test('USER sees read-only shared activity, never a personal-log claim', () => {
  const view = getDashboardPresentation('USER');
  assert.match(view.title, /ภาพรวม/);
  assert.equal(view.showManagement, false);
  assert.match(view.notice, /ทุกคน/);
  assert.doesNotMatch(view.notice, /เฉพาะของฉัน/);
});
