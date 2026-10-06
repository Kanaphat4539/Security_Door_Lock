import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPresenceReport, notificationForLivePresence } from '../src/services/proximity.ts';

test('initial API snapshot is not a fresh alert; only live present reports notify', () => {
  const snapshotAt = '2026-01-01T00:00:00Z';
  assert.equal(notificationForLivePresence({ present: true, reportedAt: snapshotAt }, snapshotAt), null);
  assert.equal(notificationForLivePresence({ present: true, reportedAt: '2026-01-01T00:01:00Z' }, snapshotAt)?.title, 'มีคนเข้ามาใกล้ประตู');
  assert.equal(notificationForLivePresence({ present: false, reportedAt: '2026-01-01T00:00:00Z' }, null), null);
  assert.equal(notificationForLivePresence({ present: null, reportedAt: null }, null), null);
});

test('duplicate reports do not produce duplicate alerts', () => {
  const report = { present: true, reportedAt: '2026-01-01T00:00:00Z' };
  assert.equal(notificationForLivePresence(report, report.reportedAt), null);
  assert.equal(notificationForLivePresence({ ...report, reportedAt: '2026-01-01T00:01:00Z' }, report.reportedAt)?.reportedAt, '2026-01-01T00:01:00Z');
});

test('recent report presentation uses reported timestamp only', () => {
  assert.match(formatPresenceReport('2026-01-01T00:00:00Z'), /รายงานล่าสุด/);
  assert.equal(formatPresenceReport(null), 'ยังไม่มีรายงานจากเซ็นเซอร์');
});
