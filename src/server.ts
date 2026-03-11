import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseSpec, type ParsedEndpoint } from './parser/openapi.js';
import { buildRequest } from './proxy/request-builder.js';
import { flattenResponse } from './proxy/response.js';
import type { ForgeConfig } from './config.js';
import { request as httpRequest } from 'undici';

export async function startServer(config: ForgeConfig): Promise<void> {
  const { endpoints, info } = await parseSpec(config.specPath);

  const baseUrl = config.baseUrl ?? info.baseUrl;
  if (!baseUrl) {
    throw new Error(
      'No base URL found in OpenAPI spec and none provided via --base-url. ' +
      'Add a "servers" entry to your spec or pass --base-url https://api.example.com'
    );
  }

  const filtered = filterEndpoints(endpoints, config.include, config.exclude);

  if (filtered.length === 0) {
    throw new Error('No endpoints matched after filtering. Check your --include/--exclude patterns.');
  }

  const server = new McpServer({
    name: `mcp-forge: ${info.title}`,
    version: info.version,
  });

  for (const endpoint of filtered) {
    registerTool(server, endpoint, baseUrl, config);
  }

  log(config, `Registered ${filtered.length} tools from "${info.title}" v${info.version}`);
  log(config, `Base URL: ${baseUrl}`);

  if (config.transport === 'stdio') {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log(config, 'MCP server running on stdio');
  } else {
    throw new Error('HTTP transport not yet implemented. Use --transport stdio (default).');
  }
}

function registerTool(
  server: McpServer,
  endpoint: ParsedEndpoint,
  baseUrl: string,
  config: ForgeConfig
): void {
  server.tool(
    endpoint.toolName,
    endpoint.description,
    endpoint.inputSchema as Record<string, unknown>,
    async (args: Record<string, unknown>) => {
      const req = buildRequest(endpoint, args, baseUrl, config.auth);

      log(config, `${req.method} ${req.url}`);

      try {
        const response = await httpRequest(req.url, {
          method: req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
          headers: req.headers,
          body: req.body,
        });

        const contentType = response.headers['content-type'] ?? '';
        let responseData: unknown;

        if (contentType.includes('application/json')) {
          responseData = await response.body.json();
        } else {
          responseData = await response.body.text();
        }

        if (response.statusCode >= 400) {
          return {
            content: [{
              type: 'text' as const,
              text: `HTTP ${response.statusCode}: ${flattenResponse(responseData)}`,
            }],
            isError: true,
          };
        }

        const text = config.flatten
          ? flattenResponse(responseData)
          : JSON.stringify(responseData, null, 2);

        return {
          content: [{ type: 'text' as const, text }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text' as const, text: `Request failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}

function filterEndpoints(
  endpoints: ParsedEndpoint[],
  include?: string[],
  exclude?: string[]
): ParsedEndpoint[] {
  let result = endpoints;

  if (include && include.length > 0) {
    result = result.filter(e =>
      include.some(pattern => matchPath(e.path, pattern))
    );
  }

  if (exclude && exclude.length > 0) {
    result = result.filter(e =>
      !exclude.some(pattern => matchPath(e.path, pattern))
    );
  }

  return result;
}

function matchPath(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*/g, '.*')
    .replace(/\//g, '\\/');
  return new RegExp(`^${regex}$`).test(path);
}

function log(config: ForgeConfig, message: string): void {
  if (config.verbose || config.transport !== 'stdio') {
    console.error(`[mcp-forge] ${message}`);
  }
}
