import type { ParsedEndpoint } from '../parser/openapi.js';
import type { AuthConfig } from '../config.js';
import { buildAuthHeaders } from './auth.js';

export interface ProxyRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export function buildRequest(
  endpoint: ParsedEndpoint,
  args: Record<string, unknown>,
  baseUrl: string,
  auth?: AuthConfig
): ProxyRequest {
  let path = endpoint.path;
  for (const param of endpoint.pathParams) {
    const value = args[param];
    if (value !== undefined) {
      path = path.replace(`{${param}}`, encodeURIComponent(String(value)));
    }
  }

  const queryParts: string[] = [];
  for (const param of endpoint.queryParams) {
    const value = args[param];
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          queryParts.push(`${encodeURIComponent(param)}=${encodeURIComponent(String(v))}`);
        }
      } else {
        queryParts.push(`${encodeURIComponent(param)}=${encodeURIComponent(String(value))}`);
      }
    }
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const url = `${baseUrl}${path}${queryString}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...buildAuthHeaders(auth),
  };

  let body: string | undefined;
  if (endpoint.hasBody && args.body !== undefined) {
    headers['Content-Type'] = endpoint.contentType;
    body = typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
  }

  return { url, method: endpoint.method, headers, body };
}
