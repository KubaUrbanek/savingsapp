import { InvestmentClassificationPolicy, OperationType } from './classification.js';
import { Money, OwnerId, ValuationDate } from './values.js';

function timestamp(value, field) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new TypeError(`${field} must be an ISO timestamp`);
  return value;
}

export const InvestmentEntry = Object.freeze({
  create({ id, type, owner, subcategory = null, valuePln, date, createdAt, updatedAt }) {
    const category = InvestmentClassificationPolicy.classify(type, subcategory);
    return Object.freeze({ id, ...category, owner: OwnerId.parse(owner), valuePln: Money.positive(valuePln, 'valuePln'),
      date: ValuationDate.parse(date), createdAt: timestamp(createdAt, 'createdAt'), updatedAt: timestamp(updatedAt, 'updatedAt') });
  }
});

export const InvestmentOperation = Object.freeze({
  create({ id, operationType, type, owner, subcategory = null, amountPln, feePln = 0, taxPln = 0, date, note = null, createdAt }) {
    const category = InvestmentClassificationPolicy.classify(type, subcategory);
    return Object.freeze({ id, operationType: OperationType.parse(operationType), ...category, owner: OwnerId.parse(owner),
      amountPln: Money.positive(amountPln, 'amountPln'), feePln: Money.zeroOrPositive(feePln, 'feePln'),
      taxPln: Money.zeroOrPositive(taxPln, 'taxPln'), date: ValuationDate.parse(date), note: note == null ? null : String(note),
      createdAt: timestamp(createdAt, 'createdAt') });
  }
});
