export interface ForgeConfig {
  specPath: string;
  baseUrl?: string;
  auth?: AuthConfig;
  include?: string[];
  exclude?: string[];
  transport: 'stdio' | 'http';
  port: number;
  flatten: boolean;
  verbose: boolean;
}

export interface AuthConfig {
  type: 'bearer' | 'api-key' | 'basic';
  value: string;
  header?: string; // for api-key type, defaults to "X-API-Key"
}

export function parseAuth(authString?: string): AuthConfig | undefined {
  if (!authString) return undefined;

  if (authString.startsWith('Bearer ')) {
    return { type: 'bearer', value: authString.slice(7) };
  }

  if (authString.includes(':')) {
    const [header, value] = authString.split(':', 2);
    return { type: 'api-key', value, header };
  }

  return { type: 'bearer', value: authString };
}

export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{?(\w+)\}?/g, (_, name) => process.env[name] ?? '');
}
