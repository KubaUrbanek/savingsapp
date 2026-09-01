import { ownersIn } from './PortfolioScope.js';

export class LoadPortfolio {
  constructor(entries) { this.entries = entries; }
  execute({ scope, filters = {} }) {
    return Promise.all(ownersIn(scope).map((owner) => this.entries.findAll({ owner, ...filters })))
      .then((groups) => groups.flat());
  }
}
