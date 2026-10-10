// @ts-nocheck
export class LoadPortfolioPlan {
  constructor(gateway) {
    this.gateway = gateway;
  }
  execute({ scope, signal }) {
    return this.gateway.load(scope, { signal });
  }
}
export class SavePortfolioPlan {
  constructor(gateway) {
    this.gateway = gateway;
  }
  execute({ scope, plan }) {
    return this.gateway.save(scope, plan);
  }
}
