// @ts-nocheck
import { mapInvestmentDto } from './dtoMapper.js';
export class FetchInvestmentEntryRepository {
  constructor(http) {
    this.http = http;
  }
  findAll(filters, { signal } = {}) {
    return this.http.json('/investments', { query: filters, signal }).then((rows) => rows.map(mapInvestmentDto));
  }
  save(entry) {
    return this.http.json('/investments', { method: 'POST', body: entry }).then(mapInvestmentDto);
  }
  delete(id) {
    return this.http.json(`/investments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
