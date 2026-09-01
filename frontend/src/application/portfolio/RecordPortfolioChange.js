export const PortfolioChangeKind = Object.freeze({
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  VALUATION: 'VALUATION',
  BUY: 'BUY',
  SELL: 'SELL'
});

export class PortfolioChangeValidationFailure extends Error {
  constructor(field, message, code) {
    super(message);
    this.name = 'PortfolioChangeValidationFailure';
    this.field = field;
    this.code = code;
  }
}

export const deposit = (asset, amountPln, previousValue) => ({ kind: PortfolioChangeKind.DEPOSIT, asset, amountPln, previousValue });
export const withdrawal = (asset, amountPln, previousValue) => ({ kind: PortfolioChangeKind.WITHDRAWAL, asset, amountPln, previousValue });
export const valuation = (asset, valuePln) => ({ kind: PortfolioChangeKind.VALUATION, asset, valuePln });
export const buy = (asset, amountPln, previousValue) => ({ kind: PortfolioChangeKind.BUY, asset, amountPln, previousValue });
export const sell = (asset, amountPln, previousValue) => ({ kind: PortfolioChangeKind.SELL, asset, amountPln, previousValue });

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new PortfolioChangeValidationFailure(field, 'Podaj kwotę większą od zera.', 'POSITIVE_AMOUNT_REQUIRED');
  }
  return number;
}

function resultingValue(command) {
  if (!Object.values(PortfolioChangeKind).includes(command?.kind)) {
    throw new PortfolioChangeValidationFailure('operationType', 'Wybierz rodzaj zmiany.', 'UNKNOWN_CHANGE_KIND');
  }
  if (!command.asset?.type) throw new PortfolioChangeValidationFailure('type', 'Wybierz aktywo.', 'ASSET_REQUIRED');
  if (!command.asset?.owner) throw new PortfolioChangeValidationFailure('owner', 'Wybierz właściciela.', 'OWNER_REQUIRED');
  if (!command.asset?.date) throw new PortfolioChangeValidationFailure('date', 'Wybierz datę.', 'DATE_REQUIRED');

  if (command.kind === PortfolioChangeKind.VALUATION) {
    const value = Number(command.valuePln);
    if (!Number.isFinite(value) || value < 0) {
      throw new PortfolioChangeValidationFailure('currentValuePln', 'Wartość nie może być ujemna.', 'NON_NEGATIVE_VALUE_REQUIRED');
    }
    return value;
  }

  const amount = positiveNumber(command.amountPln, 'amountPln');
  const previous = Number(command.previousValue || 0);
  const subtracts = command.kind === PortfolioChangeKind.WITHDRAWAL || command.kind === PortfolioChangeKind.SELL;
  if (subtracts && amount > previous) {
    throw new PortfolioChangeValidationFailure('amountPln', 'Kwota przekracza aktualną wartość aktywa.', 'INSUFFICIENT_PORTFOLIO_VALUE');
  }
  return previous + (subtracts ? -amount : amount);
}

export class RecordPortfolioChange {
  constructor(portfolioCommandGateway) { this.portfolioCommandGateway = portfolioCommandGateway; }

  async execute(command) {
    const nextValue = resultingValue(command);
    return this.portfolioCommandGateway.recordPortfolioChange({ command, nextValue });
  }
}
