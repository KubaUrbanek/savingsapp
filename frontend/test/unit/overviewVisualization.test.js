import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availableGroups,
  buildOverviewDistribution,
  buildOverviewHistory,
  filterOverviewEntries,
  groupKey,
  resolveOverviewRange
} from '../../src/domain/portfolio/overviewVisualization.js';

const entry = (type, valuePln, date = '2026-01-01', subcategory = null, owner = 'JAN') => ({
  owner,
  type,
  subcategory,
  valuePln,
  date,
  createdAt: `${date}T10:00:00Z`
});
const portfolio = [
  entry('PPK', 100),
  entry('PPO', 50),
  entry('IKE', 30, '2026-01-01', 'ZLOTO'),
  entry('IKZE', 20, '2026-01-01', 'ZLOTO'),
  entry('IKZE', 70, '2026-01-01', 'DZIESIECIOLETNIE'),
  entry('GIELDA', 80, '2026-01-01', 'RYNKI_ROZWINIETE'),
  entry('KONTO_BANKOWE', 50)
];

test('grouping distinguishes accounts and economic asset classes, retaining unknown pension composition', () => {
  assert.equal(groupKey(portfolio[2], 'accounts'), 'IKE');
  assert.equal(groupKey(portfolio[2], 'assetClasses'), 'GOLD');
  assert.equal(groupKey(portfolio[4], 'assetClasses'), 'BONDS');
  assert.equal(groupKey(portfolio[0], 'assetClasses'), 'UNCLASSIFIED');
  assert.equal(groupKey(portfolio[1], 'assetClasses'), 'UNCLASSIFIED');
  assert.deepEqual(availableGroups([...portfolio].reverse(), 'assetClasses'), [
    'BONDS',
    'STOCKS',
    'GOLD',
    'CASH',
    'UNCLASSIFIED'
  ]);
  assert.deepEqual(availableGroups(portfolio, 'accounts'), ['GIELDA', 'IKE', 'IKZE', 'KONTO_BANKOWE', 'PPK', 'PPO']);
});

test('multi-select excludes each account or all matching classes without changing source entries', () => {
  const selected = filterOverviewEntries(portfolio, 'accounts', ['PPK', 'PPO']);
  assert.equal(selected.length, 5);
  assert.equal(portfolio.length, 7);
  assert.deepEqual(
    filterOverviewEntries(portfolio, 'assetClasses', ['GOLD']).map((item) => item.valuePln),
    [100, 50, 70, 80, 50]
  );
  assert.deepEqual(filterOverviewEntries(portfolio, 'accounts', availableGroups(portfolio, 'accounts')), []);
});

test('distribution uses latest per holding, all household owners, and percentage of selected total', () => {
  const entries = [
    entry('IKE', 10, '2026-01-01', 'ZLOTO'),
    entry('IKE', 20, '2026-02-01', 'ZLOTO'),
    entry('IKE', 30, '2026-01-01', 'ZLOTO', 'ALA'),
    entry('PPK', 50)
  ];
  assert.deepEqual(buildOverviewDistribution(entries, 'assetClasses'), [
    { key: 'GOLD', value: 50, share: 50 },
    { key: 'UNCLASSIFIED', value: 50, share: 50 }
  ]);
  assert.deepEqual(buildOverviewDistribution(filterOverviewEntries(entries, 'accounts', ['PPK']), 'assetClasses'), [
    { key: 'GOLD', value: 50, share: 100 }
  ]);
});

test('distribution retains zero-valued groups without nonfinite shares and sums cents exactly', () => {
  assert.deepEqual(buildOverviewDistribution([], 'accounts'), []);
  assert.deepEqual(buildOverviewDistribution([entry('PPK', 100), entry('PPK', 0, '2026-02-01')], 'accounts'), [
    { key: 'PPK', value: 0, share: 0 }
  ]);
  assert.equal(buildOverviewDistribution([entry('PPK', 0.1), entry('PPO', 0.2)], 'assetClasses')[0].value, 0.3);
});

test('relative ranges clamp month ends and leap days without timezone dependence', () => {
  for (const [today, range, start] of [
    ['2026-03-31', '1m', '2026-02-28'],
    ['2024-03-31', '1m', '2024-02-29'],
    ['2026-05-31', '3m', '2026-02-28'],
    ['2026-08-31', '6m', '2026-02-28'],
    ['2024-02-29', '1y', '2023-02-28'],
    ['2026-01-15', '3m', '2025-10-15']
  ])
    assert.deepEqual(resolveOverviewRange([], today, range), { start, end: today, error: null });
});

test('all-history range begins at earliest selected entry, never at a future entry', () => {
  assert.deepEqual(resolveOverviewRange([entry('PPK', 10, '2026-12-01')], '2026-11-15', 'all'), {
    start: '2026-11-15',
    end: '2026-11-15',
    error: null
  });
  assert.equal(resolveOverviewRange(portfolio, '2026-11-15', 'all').start, '2026-01-01');
  assert.equal(resolveOverviewRange([], '2026-11-15', 'all').start, '2026-11-15');
});

test('custom range requires real dates in order and an end no later than today', () => {
  for (const [start, end] of [
    ['', ''],
    ['2026-02-30', '2026-03-01'],
    ['2026-2-01', '2026-03-01'],
    ['2026-03-02', '2026-03-01'],
    ['2026-11-15', '2026-11-16']
  ])
    assert.ok(resolveOverviewRange([], '2026-11-15', 'custom', start, end).error);
  assert.deepEqual(resolveOverviewRange([], '2026-11-15', 'custom', '2026-11-15', '2026-11-15'), {
    start: '2026-11-15',
    end: '2026-11-15',
    error: null
  });
});

test('history carries opening valuations forward, combines owners, and resolves same-day valuation ordering', () => {
  const entries = [
    entry('PPK', 10, '2026-01-01'),
    entry('PPK', 20, '2026-02-05'),
    { ...entry('PPK', 25, '2026-02-05'), createdAt: '2026-02-05T11:00:00Z' },
    entry('PPK', 30, '2026-01-01', null, 'ALA'),
    entry('KONTO_BANKOWE', 50, '2026-02-07'),
    entry('PPK', 1000, '2026-03-01')
  ];
  const points = buildOverviewHistory([...entries].reverse(), 'accounts', '2026-02-01', '2026-02-10');
  assert.deepEqual(points, [
    { date: '2026-02-01', total: 40, groups: { KONTO_BANKOWE: 0, PPK: 40 } },
    { date: '2026-02-05', total: 55, groups: { KONTO_BANKOWE: 0, PPK: 55 } },
    { date: '2026-02-07', total: 105, groups: { KONTO_BANKOWE: 50, PPK: 55 } },
    { date: '2026-02-10', total: 105, groups: { KONTO_BANKOWE: 50, PPK: 55 } }
  ]);
  for (const point of points)
    assert.equal(
      Object.values(point.groups).reduce((sum, value) => sum + value, 0),
      point.total
    );
});

test('history shows a constant known value when the selected range has no new valuations', () => {
  assert.deepEqual(buildOverviewHistory([entry('PPK', 10)], 'accounts', '2026-02-01', '2026-02-28'), [
    { date: '2026-02-01', total: 10, groups: { PPK: 10 } },
    { date: '2026-02-28', total: 10, groups: { PPK: 10 } }
  ]);
});

test('history does not fabricate zero before first known value and handles one date or known zero', () => {
  const entries = [entry('PPK', 10, '2026-02-15')];
  assert.deepEqual(buildOverviewHistory(entries, 'accounts', '2026-01-01', '2026-02-01'), []);
  assert.deepEqual(buildOverviewHistory(entries, 'accounts', '2026-01-01', '2026-02-15'), [
    { date: '2026-02-15', total: 10, groups: { PPK: 10 } }
  ]);
  assert.deepEqual(buildOverviewHistory([entry('PPK', 0)], 'accounts', '2026-01-01', '2026-01-01'), [
    { date: '2026-01-01', total: 0, groups: { PPK: 0 } }
  ]);
  assert.deepEqual(buildOverviewHistory([], 'accounts', '2026-01-01', '2026-01-01'), []);
});

test('history sums asset classes across wrappers and filters every historical date consistently', () => {
  const selected = filterOverviewEntries(portfolio, 'accounts', ['PPK', 'PPO']);
  const points = buildOverviewHistory(selected, 'assetClasses', '2026-01-01', '2026-02-01');
  assert.deepEqual(points[0].groups, { BONDS: 70, STOCKS: 80, GOLD: 50, CASH: 50 });
  assert.equal(points[0].total, 250);
  assert.equal(points[1].total, 250);
});
