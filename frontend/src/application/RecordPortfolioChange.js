import { calculateOperation } from '../domain/portfolio/operations.js';

export class RecordPortfolioChange {
  constructor(entries, operations) { this.entries = entries; this.operations = operations; }
  async execute({ change, previousValue }) {
    const amount = Number(change.amountPln || 0);
    const nextValue = calculateOperation(previousValue, change.operationType, amount, change.currentValuePln);
    const asset = { type: change.type, owner: change.owner, subcategory: change.subcategory, date: change.date };
    if (change.operationType !== 'VALUATION') {
      await this.operations.save({ ...asset, operationType: change.operationType, amountPln: amount });
    }
    await this.entries.save({ ...asset, valuePln: nextValue });
    return { nextValue, isValuation: change.operationType === 'VALUATION' };
  }
}
