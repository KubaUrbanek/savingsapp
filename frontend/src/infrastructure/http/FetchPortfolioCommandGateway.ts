// @ts-nocheck
/** Retries of the same intent retain their identifier, including lost HTTP responses. */
export class FetchPortfolioCommandGateway {
  constructor(http, idGenerator = () => crypto.randomUUID(), pending = undefined) {
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
    const payload = JSON.stringify(body);
    // Stable non-sensitive key: no raw portfolio data is persisted in session storage.
    const bytes = new TextEncoder().encode(payload);
    const signature = this.pending
      ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      : payload;
    if (!this.requestIds.has(command)) this.requestIds.set(command, this.pending?.get(signature) || this.idGenerator());
    const requestId = this.requestIds.get(command);
    this.pending?.put(signature, requestId);
    const result = await this.http.json('/portfolio-changes', { method: 'POST', body: { requestId, ...body } });
    if (!result || typeof result.nextValue !== 'number' || !Number.isFinite(result.nextValue) || result.atomic !== true)
      throw new TypeError('Nieprawidłowa odpowiedź zapisu portfela.');
    this.pending?.remove(signature);
    return result;
  }
  delete(id) {
    return this.http.json(`/portfolio-changes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
