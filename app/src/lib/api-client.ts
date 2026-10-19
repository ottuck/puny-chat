// A JSON client for an app server that wants a bearer token and describes failures with a stable
// code. Kept apart from the app (no `@/` imports, no auth SDK) so another app can take the file as
// it is: the app passes its server's address and how to get the current token.
//
// Failure body: { code, detail? }. A request that never got an answer is ApiError(0, 'NETWORK'); one
// that could not be signed (no one signed in) is whatever the token function throws.

// A failure the server described with a stable code. UI copy for each code lives in the app.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  // A value for the message, when the server gives one (e.g. whose seat a code is for).
  readonly detail?: string;

  constructor(status: number, code: string, detail?: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export type ApiClientOptions = {
  // Base URL without a trailing slash; asked on every request.
  baseUrl: () => string;
  // Asked on every request. Throw an ApiError to say why there is none, e.g. ApiError(401,
  // 'UNAUTHORIZED') when signed out or ApiError(0, 'NETWORK') when it could not be refreshed
  // offline; anything else counts as no answer (NETWORK).
  token: () => Promise<string>;
};

export type ApiRequest = { method?: string; body?: unknown; signal?: AbortSignal };

export function createApiClient(options: ApiClientOptions) {
  return async function api<T>(path: string, init: ApiRequest = {}): Promise<T> {
    let token: string;
    try {
      token = await options.token();
    } catch (e) {
      throw e instanceof ApiError ? e : new ApiError(0, 'NETWORK');
    }
    let response: Response;
    try {
      response = await fetch(`${options.baseUrl()}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: init.signal,
      });
    } catch {
      throw new ApiError(0, 'NETWORK');
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        code?: string;
        detail?: string;
      } | null;
      throw new ApiError(response.status, body?.code ?? 'UNKNOWN', body?.detail);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  };
}
