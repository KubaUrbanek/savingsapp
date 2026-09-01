export class HttpError extends Error {
  constructor(message, status, cause) { super(message, { cause }); this.name = 'HttpError'; this.status = status; }
}

export class FetchHttpClient {
  constructor(fetchImplementation, baseUrl = '/api') { this.fetch = fetchImplementation; this.baseUrl = baseUrl; }
  url(path, query = {}) {
    const search = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== '' && value != null));
    return `${this.baseUrl}${path}${search.size ? `?${search}` : ''}`;
  }
  json(path, { query, method = 'GET', body } = {}) {
    const options = { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) };
    return this.request(path, { query, options, responseType: 'json' });
  }
  blob(path) { return this.request(path, { responseType: 'blob' }); }
  multipart(path, body) { return this.request(path, { options: { method: 'POST', body }, responseType: 'json' }); }
  async request(path, { query, options, responseType } = {}) {
    let response;
    try { response = await this.fetch(this.url(path, query), options); }
    catch (error) { throw new HttpError('Nie można połączyć się z serwerem.', undefined, error); }
    if (!response.ok) {
      let detail;
      try { detail = await response.json(); } catch { detail = null; }
      throw new HttpError(detail?.message || `Serwer zwrócił błąd ${response.status}.`, response.status);
    }
    if (response.status === 204) return undefined;
    try { return responseType === 'blob' ? await response.blob() : await response.json(); }
    catch (error) { throw new HttpError('Serwer zwrócił nieprawidłową odpowiedź.', response.status, error); }
  }
}
