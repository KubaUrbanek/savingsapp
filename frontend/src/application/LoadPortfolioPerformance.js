import { PortfolioScopeKind } from './PortfolioScope.js';

export class LoadPortfolioPerformance {
  constructor(operations, portfolioQuery) { this.operations = operations; this.portfolioQuery = portfolioQuery; }
  execute({ scope, filters = {} }) {
    if (scope?.kind !== PortfolioScopeKind.OWNER) {
      throw new TypeError('Operations and performance require an owner portfolio scope');
    }
    const ownerFilters = { owner: scope.ownerId, ...filters };
    return Promise.all([this.operations.findAll(ownerFilters), this.portfolioQuery.loadPerformance(ownerFilters)])
      .then(([operations, performance]) => ({ operations, performance }));
  }
}
