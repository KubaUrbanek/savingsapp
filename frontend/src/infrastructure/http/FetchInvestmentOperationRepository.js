import { mapOperationDto } from './dtoMapper.js';
export class FetchInvestmentOperationRepository {
  constructor(http) { this.http = http; }
  findAll(filters) { return this.http.json('/investment-operations', { query: filters }).then((rows) => rows.map(mapOperationDto)); }
  save(operation) { return this.http.json('/investment-operations', { method: 'POST', body: operation }).then(mapOperationDto); }
  delete(id) { return this.http.json(`/investment-operations/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
}
