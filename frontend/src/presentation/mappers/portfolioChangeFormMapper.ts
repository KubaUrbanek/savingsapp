// @ts-nocheck
import { buy, deposit, sell, valuation, withdrawal } from '../../application/portfolio/RecordPortfolioChange.js';
import { subcategoriesFor } from '../../domain/portfolio/constants.js';

const factories = { DEPOSIT: deposit, WITHDRAWAL: withdrawal, VALUATION: valuation, BUY: buy, SELL: sell };

export function mapPortfolioChangeForm(form, owner, currentEntries) {
  const choices = subcategoriesFor(form.type);
  const subcategory = choices.length ? form.subcategory : null;
  const asset = { type: form.type, owner, subcategory, date: form.date };
  const latest = currentEntries.find(
    (entry) => entry.type === form.type && (entry.subcategory || null) === subcategory
  );
  const previousValue = Number(latest?.valuePln || 0);
  const factory = factories[form.operationType];

  if (!factory) return { kind: form.operationType, asset };
  return form.operationType === 'VALUATION'
    ? factory(asset, form.currentValuePln)
    : factory(asset, form.amountPln, previousValue);
}
