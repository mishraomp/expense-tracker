const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBaseUrl(): string {
  return (process.env.EXPENSE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getBypassSecret(): string {
  const secret = process.env.MCP_BYPASS_SECRET;
  if (!secret) {
    throw new ApiError(
      'MCP_BYPASS_SECRET is not set. In Claude Code, copy mcp-server/.env.example to mcp-server/.env ' +
        'and fill it in. In Claude Desktop, set it in the extension settings. Either way it must match ' +
        'MCP_LOCAL_BYPASS_SECRET in backend/.env.',
    );
  }
  return secret;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
}

/** The API's origin (protocol+host+port, no path) — for building requests from
 *  a full server-relative path (e.g. one taken straight from the OpenAPI spec)
 *  instead of a path relative to getBaseUrl()'s own /api/v1 prefix. */
export function getApiOrigin(): string {
  return new URL(getBaseUrl()).origin;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return doRequest<T>(`${getBaseUrl()}${path}`, options);
}

/** Same as apiRequest, but takes a full server-relative path (already including
 *  whatever prefix the OpenAPI spec reports, e.g. "/api/v1/expenses/{id}") instead
 *  of one relative to getBaseUrl(). Used by the OpenAPI-driven auto-generated tools. */
export async function apiRequestByPath<T>(fullPath: string, options: RequestOptions = {}): Promise<T> {
  return doRequest<T>(`${getApiOrigin()}${fullPath}`, options);
}

async function doRequest<T>(urlString: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(urlString);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-bypass-secret': getBypassSecret(),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `Could not reach the expense tracker API at ${getBaseUrl()}. ` +
        `Is the backend running (cd backend && npm run start:dev)? (${cause})`,
    );
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const body = data as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join('; ')
      : (body?.message ?? response.statusText);
    throw new ApiError(message, response.status);
  }

  return data as T;
}
