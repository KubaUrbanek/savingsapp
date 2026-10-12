// @ts-nocheck
import { validWeights } from '../../domain/portfolio/services/PurchasePlanningService.js';
export class FetchPortfolioPlanGateway {
  constructor(http) {
    this.http = http;
  }
  validate(p) {
    if (
      !p ||
      p.allocationVersion !== 2 ||
      !['bonds', 'stocks', 'gold', 'developed', 'emerging'].every((k) => typeof p[k] === 'number') ||
      !validWeights({ bonds: p.bonds, stocks: p.stocks }) ||
      !validWeights({ gold: p.gold, developed: p.developed, emerging: p.emerging })
    )
      throw new TypeError('Nieprawidłowy plan portfela');
    return Object.fromEntries(['bonds', 'stocks', 'gold', 'developed', 'emerging'].map((key) => [key, p[key]]));
  }
  async load(scope, { signal } = {}) {
    return this.validate(await this.http.json('/portfolio-plans', { query: { scope }, signal }));
  }
  async save(scope, plan) {
    return this.validate(
      await this.http.json('/portfolio-plans', {
        method: 'PUT',
        query: { scope },
        body: { ...this.validate({ ...plan, allocationVersion: 2 }), allocationVersion: 2 }
      })
    );
  }
}
