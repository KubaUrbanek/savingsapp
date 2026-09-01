export class HttpError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number, cause?: unknown) {
    super(message, { cause });
    this.name = 'HttpError';
    this.status = status;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;
type RequestArguments = {
  query?: Query | undefined;
  options?: RequestInit | undefined;
  responseType?: 'json' | 'blob' | undefined;
};
type JsonArguments = { query?: Query; method?: string; body?: unknown; signal?: AbortSignal };

export class FetchHttpClient {
  constructor(
    private readonly fetchImplementation: typeof fetch,
    private readonly baseUrl = '/api'
  ) {}

  url(path: string, query: Query = {}): string {
    const search = new URLSearchParams(
      Object.entries(query).flatMap(([key, value]) => (value === '' || value == null ? [] : [[key, String(value)]]))
    );
    return `${this.baseUrl}${path}${search.size ? `?${search}` : ''}`;
  }

  json<T = unknown>(path: string, { query, method = 'GET', body, signal }: JsonArguments = {}): Promise<T> {
    const options: RequestInit = {
      method,
      ...(signal ? { signal } : {}),
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    };
    return this.request<T>(path, { query, options, responseType: 'json' });
  }

  blob(path: string): Promise<Blob> {
    return this.request<Blob>(path, { responseType: 'blob' });
  }
  multipart<T = unknown>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, { options: { method: 'POST', body }, responseType: 'json' });
  }

  async request<T = unknown>(
    path: string,
    { query, options, responseType = 'json' }: RequestArguments = {}
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImplementation(this.url(path, query), options);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new HttpError('Nie można połączyć się z serwerem.', undefined, error);
    }
    if (!response.ok) {
      let detail: unknown;
      try {
        detail = await response.json();
      } catch {
        detail = null;
      }
      const message =
        typeof detail === 'object' && detail !== null && 'message' in detail && typeof detail.message === 'string'
          ? detail.message
          : `Serwer zwrócił błąd ${response.status}.`;
      throw new HttpError(message, response.status);
    }
    if (response.status === 204) return undefined as T;
    try {
      return (responseType === 'blob' ? await response.blob() : await response.json()) as T;
    } catch (error: unknown) {
      throw new HttpError('Serwer zwrócił nieprawidłową odpowiedź.', response.status, error);
    }
  }
}
