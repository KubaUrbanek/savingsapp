import { PortfolioScopeKind } from './PortfolioScope.js';

export class LoadPortfolioPerformance {
  constructor(operations, portfolioQuery) { this.operations = operations; this.portfolioQuery = portfolioQuery; }
  execute({ scope, filters = {}, signal }) {
    if (scope?.kind !== PortfolioScopeKind.OWNER) {
      throw new TypeError('Operations and performance require an owner portfolio scope');
    }
    const ownerFilters = { owner: scope.ownerId, ...filters };
    return Promise.all([this.operations.findAll(ownerFilters, { signal }), this.portfolioQuery.loadPerformance(ownerFilters, { signal })])
      .then(([operations, performance]) => ({ operations, performance }));
  }
}
