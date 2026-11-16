// @ts-nocheck
import { buy, deposit, sell, valuation, withdrawal } from '../../application/portfolio/RecordPortfolioChange.js';
import { subcategoriesFor } from '../../domain/portfolio/constants.js';

import { moneyInput } from '../../domain/portfolio/decimal.js';
import { PortfolioChangeValidationFailure } from '../../application/portfolio/RecordPortfolioChange.js';
import { today } from '../viewModels/formatters.js';

const factories = { DEPOSIT: deposit, WITHDRAWAL: withdrawal, VALUATION: valuation, BUY: buy, SELL: sell };

export function mapPortfolioChangeForm(form, owner, currentEntries) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
    !Number.isFinite(Date.parse(form.date)) ||
    new Date(form.date).toISOString().slice(0, 10) !== form.date ||
    form.date > today()
  )
    throw new PortfolioChangeValidationFailure(
      'date',
      'Wybierz poprawną datę, nie późniejszą niż dzisiaj.',
      'INVALID_DATE'
    );
  const explicit = form.action === 'INITIAL' || form.action === 'VALUATION';
  const parse = (value, field) => {
    const amount = moneyInput(value);
    if (amount == null)
      throw new PortfolioChangeValidationFailure(
        field,
        'Podaj kwotę z najwyżej dwoma miejscami po przecinku.',
        'INVALID_MONEY'
      );
    return amount;
  };
  form = {
    ...form,
    ...(explicit ? { currentValuePln: parse(form.currentValuePln, 'currentValuePln') } : {}),
    ...(!explicit || (form.action === 'INITIAL' && form.costKnown)
      ? { amountPln: parse(form.amountPln, 'amountPln') }
      : {})
  };
  const choices = form.type ? subcategoriesFor(form.type) : [];
  const subcategory = choices.length ? form.subcategory : null;
  const asset = { type: form.type, owner, subcategory, date: form.date };
  const latest = [...currentEntries]
    .filter((entry) => entry.owner === owner && entry.date <= form.date)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .find((entry) => entry.type === form.type && (entry.subcategory || null) === subcategory);
  const previousValue = Number(latest?.valuePln || 0);
  if (form.action === 'INITIAL')
    return form.costKnown === false
      ? valuation(asset, form.currentValuePln)
      : { kind: 'INITIAL', asset, valuePln: form.currentValuePln, amountPln: form.amountPln };
  const operationType = factories[form.action] ? form.action : form.operationType;
  const factory = factories[operationType];

  if (!factory) return { kind: operationType, asset };
  return operationType === 'VALUATION'
    ? factory(asset, form.currentValuePln)
    : {
        ...factory(asset, form.amountPln, previousValue),
        cashType: form.cashType,
        cashAvailable:
          [...currentEntries]
            .filter((e) => e.owner === owner && e.type === form.cashType && e.date <= form.date)
            .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
            ?.valuePln ?? null
      };
}
