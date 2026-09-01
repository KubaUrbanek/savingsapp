import { mapPerformanceDto } from './dtoMapper.js';
export class FetchPortfolioQueryGateway {
  constructor(http) { this.http = http; }
  loadPerformance(filters, { signal } = {}) { return this.http.json('/portfolio-performance', { query: filters, signal }).then(mapPerformanceDto); }
}
