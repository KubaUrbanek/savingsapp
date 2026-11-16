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
      !['bonds', 'gold', 'developed', 'emerging'].every((k) => typeof p[k] === 'number' || typeof p[k] === 'string') ||
      !validWeights({ bonds: p.bonds, gold: p.gold, developed: p.developed, emerging: p.emerging })
    )
      throw new TypeError('Nieprawidłowy plan portfela');
    return Object.fromEntries(['bonds', 'gold', 'developed', 'emerging'].map((key) => [key, p[key]]));
  }
  async load(scope, { signal } = {}) {
    const plan = await this.http.json('/portfolio-plans', { query: { scope: 'household' }, signal });
    return plan == null ? null : this.validate(plan);
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
