import assert from 'node:assert/strict';
import test from 'node:test';

import {analyticsSchemas} from '../lib/admin-analytics-contract.mjs';

test('the BFF keeps net revenue and provider fees in the finance summary', () => {
  const {shape} = analyticsSchemas['analytics-summary'];
  assert.ok(shape.netRevenueTiyin, 'netRevenueTiyin must survive the response projection');
  assert.ok(shape.providerFeesTiyin, 'providerFeesTiyin must survive the response projection');
  assert.equal(shape.netRevenueTiyin.safeParse('2161780800').success, true);
  assert.equal(shape.netRevenueTiyin.safeParse(undefined).success, true, 'older backends omit it');
  assert.equal(shape.netRevenueTiyin.safeParse('-1').success, false);
});
