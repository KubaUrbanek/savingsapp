// @ts-nocheck
import { ownersIn } from './PortfolioScope.js';

export class LoadPortfolio {
  constructor(entries) {
    this.entries = entries;
  }
  execute({ scope, filters = {}, signal }) {
    return Promise.all(ownersIn(scope).map((owner) => this.entries.findAll({ owner, ...filters }, { signal }))).then(
      (groups) => groups.flat()
    );
  }
}
