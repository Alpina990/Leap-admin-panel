import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAdminDateTime, formatAdminDayMonthTime, formatAdminRegistered, formatAdminRelativeTime} from '../lib/admin-date-time.mjs';

test('admin timestamps are displayed in Tashkent time', () => {
  assert.equal(formatAdminDateTime('2026-01-01T00:00:00+00:00'), '2026-01-01 05:00');
});

test('registered stamp drops the year and splits the time', () => {
  assert.deepEqual(formatAdminRegistered('2026-01-01T00:00:00+00:00'), {date: '01-01|', time: '05:00'});
});

test('day-month-time format omits the year', () => {
  assert.equal(formatAdminDayMonthTime('2026-01-01T00:00:00+00:00'), '01-01|05:00');
});

test('last activity shows the day-month and a relative phrase', () => {
  const now = new Date('2026-01-01T05:15:00+00:00').getTime();
  assert.equal(formatAdminRelativeTime('2026-01-01T05:00:00+00:00', now), '01-01 | 15 daqiqa oldin');
  assert.equal(formatAdminRelativeTime('2026-01-01T03:00:00+00:00', now), '01-01 | 2 soat oldin');
  assert.equal(formatAdminRelativeTime('2025-12-30T05:15:00+00:00', now), '30-12 | 2 kun oldin');
});

test('last activity falls back to "hozir" and follows larger units', () => {
  const now = new Date('2026-01-01T05:15:30+00:00').getTime();
  assert.equal(formatAdminRelativeTime('2026-01-01T05:15:00+00:00', now), '01-01 | hozir');
  assert.equal(formatAdminRelativeTime('2026-01-01T05:15:00+00:00', now + 86_400_000 * 40), '01-01 | 1 oy oldin');
});

test('empty values fall back to a dash', () => {
  assert.equal(formatAdminDateTime(null), '—');
  assert.equal(formatAdminDayMonthTime(null), '—');
  assert.equal(formatAdminRelativeTime(null), '—');
  assert.deepEqual(formatAdminRegistered(null), {date: '—', time: ''});
});
