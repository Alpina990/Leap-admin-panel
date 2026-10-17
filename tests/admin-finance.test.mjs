import test from 'node:test';
import assert from 'node:assert/strict';
import {availableBalanceTiyin} from '../lib/admin-finance.mjs';

test('available balance subtracts so‘m withdrawals from tiyin revenue', () => {
  assert.equal(availableBalanceTiyin('700000000', '6100000'), '90000000');
});

test('available balance preserves a negative balance when withdrawals exceed revenue', () => {
  assert.equal(availableBalanceTiyin('10000', '101'), '-100');
});
