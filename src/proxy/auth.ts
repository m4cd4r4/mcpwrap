import type { AuthConfig } from '../config.js';

export function buildAuthHeaders(auth?: AuthConfig): Record<string, string> {
  if (!auth) return {};

  switch (auth.type) {
    case 'bearer':
      return { Authorization: `Bearer ${auth.value}` };
    case 'api-key':
      return { [auth.header ?? 'X-API-Key']: auth.value };
    case 'basic':
      return { Authorization: `Basic ${Buffer.from(auth.value).toString('base64')}` };
    default:
      return {};
  }
}
