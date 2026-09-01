import { DomainValidationError } from './values.js';

function enumType(name, values) {
  const result = Object.fromEntries(values.map((value) => [value, value]));
  Object.defineProperty(result, 'parse', { value(value) {
    if (!values.includes(value)) throw new DomainValidationError(name, `Unknown ${name}: ${String(value)}`);
    return value;
  }});
  Object.defineProperty(result, 'values', { value: Object.freeze([...values]) });
  return Object.freeze(result);
}

export const InvestmentType = enumType('investment type', [
  'OBLIGACJE', 'GIELDA', 'IKE', 'IKZE', 'KONTO_OSZCZEDNOSCIOWE', 'KONTO_BANKOWE', 'PPK', 'PPO'
]);
export const InvestmentSubcategory = enumType('investment subcategory', [
  'ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE', 'TRZYLETNIE', 'DZIESIECIOLETNIE', 'DWUNASTOLETNIE'
]);
export const OperationType = enumType('operation type', ['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'VALUATION']);

const MARKETS = Object.freeze([InvestmentSubcategory.ZLOTO, InvestmentSubcategory.RYNKI_ROZWINIETE, InvestmentSubcategory.RYNKI_ROZWIJAJACE_SIE]);
const ALLOWED = Object.freeze({
  OBLIGACJE: Object.freeze([InvestmentSubcategory.TRZYLETNIE, InvestmentSubcategory.DZIESIECIOLETNIE, InvestmentSubcategory.DWUNASTOLETNIE]),
  GIELDA: MARKETS, IKE: MARKETS, IKZE: MARKETS
});

// A missing subcategory has one representation in the domain: null.
export function optionalSubcategory(value) {
  if (value === undefined || value === null || value === '') return null;
  return InvestmentSubcategory.parse(value);
}

export const InvestmentClassificationPolicy = Object.freeze({
  subcategoriesFor(type) { return ALLOWED[InvestmentType.parse(type)] || Object.freeze([]); },
  classify(type, subcategory) {
    const parsedType = InvestmentType.parse(type);
    const parsedSubcategory = optionalSubcategory(subcategory);
    const allowed = this.subcategoriesFor(parsedType);
    if (allowed.length && !allowed.includes(parsedSubcategory)) {
      throw new DomainValidationError('subcategory', `A compatible subcategory is required for ${parsedType}`);
    }
    if (!allowed.length && parsedSubcategory !== null) {
      throw new DomainValidationError('subcategory', `${parsedType} does not support a subcategory`);
    }
    return Object.freeze({ type: parsedType, subcategory: parsedSubcategory });
  },
  globalAssetClass({ type, subcategory }) {
    const category = this.classify(type, subcategory);
    if (category.type === InvestmentType.OBLIGACJE) return 'BONDS';
    if (category.subcategory === InvestmentSubcategory.ZLOTO) return 'GOLD';
    if ([InvestmentType.GIELDA, InvestmentType.IKE, InvestmentType.IKZE].includes(category.type)) return 'STOCKS';
    return 'CASH';
  }
});

export const subcategoriesFor = (type) => InvestmentClassificationPolicy.subcategoriesFor(type);
export const globalAssetClass = (entry) => InvestmentClassificationPolicy.globalAssetClass(entry);
