import { mapInvestmentDto, mapOperationDto } from './dtoMapper.js';

async function responseBody(response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
const query = (filters = {}) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));

export class FetchPortfolioGateway {
  constructor(fetchImplementation, baseUrl = '/api') { this.fetch = fetchImplementation; this.baseUrl = baseUrl; }
  getUsers() { return this.fetch(`${this.baseUrl}/users`).then(responseBody); }
  getInvestmentTypes() { return this.fetch(`${this.baseUrl}/investment-types`).then(responseBody); }
  getInvestments(filters) { return this.fetch(`${this.baseUrl}/investments?${query(filters)}`).then(responseBody).then((rows) => rows.map(mapInvestmentDto)); }
  getOperations(filters) { return this.fetch(`${this.baseUrl}/investment-operations?${query(filters)}`).then(responseBody).then((rows) => rows.map(mapOperationDto)); }
  getPerformance(filters) { return this.fetch(`${this.baseUrl}/portfolio-performance?${query(filters)}`).then(responseBody); }
  saveInvestment(payload) { return this.#json('/investments', 'POST', payload).then(mapInvestmentDto); }
  deleteInvestment(id) { return this.#request(`/investments/${id}`, { method: 'DELETE' }); }
  saveOperation(payload) { return this.#json('/investment-operations', 'POST', payload).then(mapOperationDto); }
  deleteOperation(id) { return this.#request(`/investment-operations/${id}`, { method: 'DELETE' }); }
  exportDatabase() { return this.fetch(`${this.baseUrl}/database/export`).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.blob(); }); }
  importDatabase(file) { const body = new FormData(); body.append('file', file); return this.#request('/database/import', { method: 'POST', body }); }
  #json(path, method, body) { return this.#request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  #request(path, options) { return this.fetch(`${this.baseUrl}${path}`, options).then(responseBody); }
}
