import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAdminDateTime, formatAdminDayMonthTime, formatAdminRegistered} from '../lib/admin-date-time.mjs';

test('admin timestamps are displayed in Tashkent time', () => {
  assert.equal(formatAdminDateTime('2026-01-01T00:00:00+00:00'), '2026-01-01 05:00');
});

test('registered stamp drops the year and splits the time', () => {
  assert.deepEqual(formatAdminRegistered('2026-01-01T00:00:00+00:00'), {date: '01-01', time: '05:00'});
});

test('day-month-time format omits the year', () => {
  assert.equal(formatAdminDayMonthTime('2026-01-01T00:00:00+00:00'), '01-01 05:00');
});

test('empty values fall back to a dash', () => {
  assert.equal(formatAdminDateTime(null), '—');
  assert.equal(formatAdminDayMonthTime(null), '—');
  assert.deepEqual(formatAdminRegistered(null), {date: '—', time: ''});
});
