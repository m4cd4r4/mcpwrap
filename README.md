# MCP Forge

Turn any REST API into an MCP server in 10 seconds.

```bash
npx mcp-forge --spec https://petstore3.swagger.io/api/v3/openapi.json
```

No code generation. No config files. Just point and serve.

## Why?

Other tools generate static code from your OpenAPI spec. MCP Forge wraps your API **at runtime** - it reads the spec, creates MCP tools dynamically, and proxies requests to your API. Update the spec, restart, done.

## Quick Start

```bash
# From a URL
npx mcp-forge --spec https://api.example.com/openapi.json

# From a local file
npx mcp-forge --spec ./my-api.yaml

# With authentication
npx mcp-forge --spec ./api.json --auth "Bearer $MY_TOKEN"

# With API key header
npx mcp-forge --spec ./api.json --auth "X-API-Key:your-key-here"

# Filter endpoints
npx mcp-forge --spec ./api.json --include "/pets/*" --exclude "/admin/*"
```

## Claude Desktop Integration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": ["mcp-forge", "--spec", "https://api.example.com/openapi.json"]
    }
  }
}
```

## How It Works

1. Reads your OpenAPI 3.0/3.1 spec (JSON or YAML, local or remote)
2. Parses every endpoint into an MCP tool (one tool per operation)
3. Maps parameters and request bodies to MCP tool input schemas
4. Proxies tool calls to your API and returns the response
5. Flattens large/nested responses for LLM readability

## Features

- **Runtime wrapping** - no generated code to maintain
- **OpenAPI 3.0 and 3.1** support
- **All HTTP methods** - GET, POST, PUT, DELETE, PATCH
- **Auth passthrough** - Bearer tokens, API keys, Basic auth
- **Path and query params** - automatically mapped from tool arguments
- **Request body** - JSON body passed as `body` argument
- **Response flattening** - truncates deep nesting and long arrays
- **Endpoint filtering** - include/exclude by path pattern
- **Verbose mode** - logs requests to stderr for debugging

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--spec <path>` | Path or URL to OpenAPI spec (required) | - |
| `--base-url <url>` | Override base URL from spec | From spec |
| `--auth <auth>` | Auth: `Bearer TOKEN`, `HEADER:VALUE` | None |
| `--include <patterns>` | Only include matching paths | All |
| `--exclude <patterns>` | Exclude matching paths | None |
| `--transport <type>` | `stdio` or `http` | `stdio` |
| `--port <number>` | Port for HTTP transport | `3100` |
| `--no-flatten` | Disable response flattening | Enabled |
| `--verbose` | Log requests to stderr | Off |

## Tool Naming

Tools are named using the `operationId` from your spec when available, falling back to `METHOD_path_segments` (e.g., `get_pets_petId`).

## Development

```bash
git clone https://github.com/m4cd4r4/mcp-forge
cd mcp-forge
npm install
npm test
npm run dev -- --spec examples/petstore.json --verbose
```

## License

MIT
