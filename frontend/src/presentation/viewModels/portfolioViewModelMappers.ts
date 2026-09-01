// @ts-nocheck
import {
  formatMoney,
  formatPercent,
  formatPercentagePoints,
  formatSignedMoney,
  formatUnsignedPercent,
  displayName,
  GLOBAL_ASSET_LABELS,
  SUBCATEGORY_LABELS,
  TYPE_LABELS
} from './formatters.js';

const signClass = (value, base = '') => `${base}${base ? ' ' : ''}${value >= 0 ? 'positiveText' : 'negativeText'}`;
const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pl-PL', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
};

export function mapTimeSeriesViewModel(points, types, selectedType, period) {
  const latest = points.at(-1);
  const max = Math.max(0, ...points.map((point) => point.total));
  return {
    selectedType,
    period,
    typeOptions: [
      { value: 'ALL', label: 'Wszystkie inwestycje' },
      ...types.map((value) => ({ value, label: TYPE_LABELS[value] || value }))
    ],
    total: formatMoney(latest?.total || 0),
    change: formatMoney(latest?.changeAmount || 0),
    changePercent: formatPercent(latest?.changePercent),
    changeClass: latest?.changeAmount >= 0 ? 'metricCard positive' : 'metricCard negative',
    percentClass: latest?.changePercent >= 0 ? 'metricCard positive' : 'metricCard negative',
    rows: points.map((point) => ({
      ...point,
      label: period === 'yearly' ? point.key : monthLabel(point.key),
      valueLabel: formatMoney(point.total),
      changeLabel: formatPercent(point.changePercent),
      changeClass: signClass(point.changeAmount),
      heightRatio: max ? point.total / max : 0
    }))
  };
}

export function mapGlobalAllocationViewModel(result, targetTotal) {
  return {
    ...result,
    investedTotalLabel: formatMoney(result.investedTotal),
    cashTotalLabel: formatMoney(result.cashTotal),
    targetTotalLabel: formatUnsignedPercent(targetTotal),
    statusClass: Math.abs(targetTotal - 100) < 0.001 ? 'allocationStatus valid' : 'allocationStatus invalid',
    rows: result.rows.map((row) => ({
      ...row,
      label: GLOBAL_ASSET_LABELS[row.assetClass],
      currentValueLabel: formatMoney(row.currentValue),
      currentWeightLabel: formatUnsignedPercent(row.currentWeight),
      targetWeightLabel: formatUnsignedPercent(row.targetWeight),
      deviationLabel: formatPercentagePoints(row.deviation),
      deviationClass: Math.abs(row.deviation) < 0.01 ? '' : signClass(-row.deviation),
      rebalanceLabel: formatSignedMoney(row.rebalanceAmount),
      rebalanceClass: signClass(row.rebalanceAmount),
      contributionLabel: row.contributionAmount == null ? 'Niemożliwe' : formatMoney(row.contributionAmount)
    }))
  };
}

export function mapHouseholdViewModel(result, users, types) {
  return {
    ...result,
    totalLabel: formatMoney(result.total),
    changeLabel: formatSignedMoney(result.latestMonth?.changeAmount || 0),
    changePercentLabel: formatPercent(result.latestMonth?.changePercent),
    changeClass: signClass(result.latestMonth?.changeAmount || 0, 'householdChange'),
    owners: users.map((owner) => ({
      owner,
      name: displayName(owner),
      valueLabel: formatMoney(result.totalsByOwner[owner] || 0),
      shareLabel: formatUnsignedPercent(result.total ? ((result.totalsByOwner[owner] || 0) / result.total) * 100 : 0)
    })),
    types: types.map((type) => ({
      type,
      label: TYPE_LABELS[type] || type,
      valueLabel: formatMoney(result.totalsByType[type] || 0),
      share: result.total ? ((result.totalsByType[type] || 0) / result.total) * 100 : 0
    }))
  };
}
