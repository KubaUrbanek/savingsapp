// @ts-nocheck
export class PortfolioChangePersistenceFailure extends Error {
  constructor(message, operationPersisted = false) {
    super(message);
    this.name = 'PortfolioChangePersistenceFailure';
    this.operationPersisted = operationPersisted;
    this.atomic = false;
  }
}

// The current API has separate operation and valuation endpoints. This adapter
// deliberately exposes that limitation instead of promising transactional work.
export class FetchPortfolioCommandGateway {
  constructor(entries, operations) {
    this.entries = entries;
    this.operations = operations;
  }

  async recordPortfolioChange({ command, nextValue }) {
    const asset = command.asset;
    let operationPersisted = false;
    try {
      if (command.kind !== 'VALUATION') {
        await this.operations.save({ ...asset, operationType: command.kind, amountPln: Number(command.amountPln) });
        operationPersisted = true;
      }
      await this.entries.save({ ...asset, valuePln: nextValue });
      return { nextValue, kind: command.kind, atomic: command.kind === 'VALUATION' };
    } catch (error) {
      throw new PortfolioChangePersistenceFailure(
        operationPersisted
          ? 'Zapisano operację, ale nie udało się zapisać wyceny. Odśwież dane przed ponowną próbą.'
          : error.message,
        operationPersisted
      );
    }
  }
}
