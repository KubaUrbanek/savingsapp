// @ts-nocheck
import { PortfolioScopeKind } from './PortfolioScope.js';
import { buildCurrentSnapshot } from '../domain/portfolio/snapshot.js';
import { aggregatePerformance } from '../domain/portfolio/services/PerformanceAggregationService.js';
export class LoadPortfolioPerformance {
  constructor(operations, portfolioQuery, entries) {
    this.operations = operations;
    this.portfolioQuery = portfolioQuery;
    this.entries = entries;
  }
  async execute({ scope, filters = {}, signal }) {
    const owners = scope.kind === PortfolioScopeKind.OWNER ? [scope.ownerId] : scope.ownerIds;
    const results = await Promise.all(
      owners.map(async (owner) => {
        const query = { owner, ...filters };
        const [operations, performance, entries] = await Promise.all([
          this.operations.findAll(query, { signal }),
          this.portfolioQuery.loadPerformance(query, { signal }),
          this.entries ? this.entries.findAll(query, { signal }) : []
        ]);
        const assets = await Promise.all(
          buildCurrentSnapshot(entries).map(async (entry) => ({
            ...entry,
            performance: await this.portfolioQuery.loadPerformance(
              { owner, type: entry.type, subcategory: entry.subcategory },
              { signal }
            )
          }))
        );
        return { operations, performance, assets };
      })
    );
    return {
      operations: results.flatMap((r) => r.operations),
      assets: results.flatMap((r) => r.assets),
      performance:
        results.length === 1 ? results[0].performance : aggregatePerformance(results.map((r) => r.performance))
    };
  }
}
