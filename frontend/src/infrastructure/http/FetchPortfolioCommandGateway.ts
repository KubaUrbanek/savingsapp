// @ts-nocheck
import { createRequestId, requestSignature } from './BrowserRequestIdentity.js';
/** Retries of the same intent retain their identifier, including lost HTTP responses. */
export class FetchPortfolioCommandGateway {
  constructor(http, idGenerator = createRequestId, pending = undefined) {
    this.http = http;
    this.idGenerator = idGenerator;
    this.requestIds = new WeakMap();
    this.pending = pending;
  }
  async recordPortfolioChange({ command }) {
    const body = {
      kind: command.kind,
      ...command.asset,
      amountPln: command.amountPln == null ? undefined : Number(command.amountPln),
      valuePln: command.valuePln == null ? undefined : Number(command.valuePln),
      cashType: command.cashType
    };
    const payload = JSON.stringify({ editId: command.editId, ...body });
    // Stable non-sensitive key: no raw portfolio data is persisted in session storage.
    const signature = this.pending ? requestSignature(payload) : payload;
    if (!this.requestIds.has(command)) this.requestIds.set(command, this.pending?.get(signature) || this.idGenerator());
    const requestId = command.editId || this.requestIds.get(command);
    this.pending?.put(signature, requestId);
    const url = command.editId ? `/portfolio-changes/${encodeURIComponent(command.editId)}` : '/portfolio-changes';
    const result = await this.http.json(url, { method: command.editId ? 'PUT' : 'POST', body: { requestId, ...body } });
    if (!result || typeof result.nextValue !== 'number' || !Number.isFinite(result.nextValue) || result.atomic !== true)
      throw new TypeError('Nieprawidłowa odpowiedź zapisu portfela.');
    this.pending?.remove(signature);
    return result;
  }
  delete(id) {
    return this.http.json(`/portfolio-changes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
