// @ts-nocheck
import { validWeights } from '../../domain/portfolio/services/PurchasePlanningService.js';
export class FetchPortfolioPlanGateway {
  constructor(http) {
    this.http = http;
  }
  validate(p) {
    if (
      !p ||
      p.allocationVersion !== 3 ||
      !['bonds', 'stocks', 'gold', 'developed', 'emerging', 'bitcoin'].every((k) => typeof p[k] === 'number') ||
      !validWeights({ bonds: p.bonds, stocks: p.stocks }) ||
      !validWeights({ bitcoin: p.bitcoin, gold: p.gold, developed: p.developed, emerging: p.emerging })
    )
      throw new TypeError('Nieprawidłowy plan portfela');
    return Object.fromEntries(
      ['bonds', 'stocks', 'gold', 'developed', 'emerging', 'bitcoin'].map((key) => [key, p[key]])
    );
  }
  async load(scope, { signal } = {}) {
    return this.validate(await this.http.json('/portfolio-plans', { query: { scope }, signal }));
  }
  async save(scope, plan) {
    return this.validate(
      await this.http.json('/portfolio-plans', {
        method: 'PUT',
        query: { scope },
        body: { ...this.validate({ ...plan, allocationVersion: 3 }), allocationVersion: 3 }
      })
    );
  }
}
