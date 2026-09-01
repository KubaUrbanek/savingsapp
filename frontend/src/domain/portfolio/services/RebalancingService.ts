// @ts-nocheck
/** Pure rebalancing policy; it has no knowledge of storage or presentation. */
export const RebalancingService = Object.freeze({
  global(plan) {
    const requiredFinalTotal = plan.rows.reduce(
      (minimum, row) =>
        row.targetWeight === 0
          ? row.currentValue > 0
            ? Infinity
            : minimum
          : Math.max(minimum, row.currentValue / (row.targetWeight / 100)),
      plan.investedTotal
    );
    return {
      ...plan,
      requiredFinalTotal,
      contributionOnlyTotal: requiredFinalTotal - plan.investedTotal,
      rows: plan.rows.map((row) => ({
        ...row,
        deviation: row.currentWeight - row.targetWeight,
        rebalanceAmount: (plan.investedTotal * row.targetWeight) / 100 - row.currentValue,
        contributionAmount: Number.isFinite(requiredFinalTotal)
          ? Math.max(0, (requiredFinalTotal * row.targetWeight) / 100 - row.currentValue)
          : null
      }))
    };
  },
  stocks(plan, contribution = 0) {
    const projectedTotal = plan.total + Number(contribution || 0);
    const rows = plan.rows.map((row) => {
      const targetValue = (plan.total * row.targetWeight) / 100;
      const difference = targetValue - row.currentValue;
      const targetValueAfterContribution = (projectedTotal * row.targetWeight) / 100;
      return {
        ...row,
        targetValue,
        difference,
        divergencePercent: targetValue > 0 ? (difference / targetValue) * 100 : null,
        currentWeight: plan.total > 0 ? (row.currentValue / plan.total) * 100 : 0,
        targetValueAfterContribution,
        amountToAdd: targetValueAfterContribution - row.currentValue
      };
    });
    return { ...plan, contribution: Number(contribution || 0), projectedTotal, rows };
  }
});
