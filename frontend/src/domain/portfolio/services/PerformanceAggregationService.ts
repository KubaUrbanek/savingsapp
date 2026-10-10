// @ts-nocheck
export function aggregatePerformance(values) {
  if (!values.length) return null;
  const keys = [
    'currentValuePln',
    'contributedCapitalPln',
    'nominalResultPln',
    'monthlyResultPln',
    'depositsTotalPln',
    'withdrawalsTotalPln'
  ];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      values.some((v) => v?.[key] == null) ? null : values.reduce((sum, v) => sum + Number(v[key]), 0)
    ])
  );
}
