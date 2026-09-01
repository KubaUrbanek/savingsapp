export class LoadPortfolioPerformance {
  constructor(operations, portfolioQuery) { this.operations = operations; this.portfolioQuery = portfolioQuery; }
  execute(filters) {
    return Promise.all([this.operations.findAll(filters), this.portfolioQuery.loadPerformance(filters)])
      .then(([operations, performance]) => ({ operations, performance }));
  }
}
