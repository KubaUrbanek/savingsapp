import { mapPerformanceDto } from './dtoMapper.js';
export class FetchPortfolioQueryGateway {
  constructor(http) { this.http = http; }
  loadPerformance(filters) { return this.http.json('/portfolio-performance', { query: filters }).then(mapPerformanceDto); }
}
