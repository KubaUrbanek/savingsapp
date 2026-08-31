export function calculateOperation(previousValue, operationType, amount, currentValue) {
  if (operationType === 'VALUATION') return Number(currentValue);
  const direction = operationType === 'WITHDRAWAL' ? -1 : 1;
  return Math.max(0, Number(previousValue || 0) + direction * Number(amount || 0));
}
