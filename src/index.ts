#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from './server.js';
import { parseAuth, resolveEnvVars, type ForgeConfig } from './config.js';

const program = new Command();

program
  .name('mcpwrap')
  .description('Turn any REST API into an MCP server. Zero codegen.')
  .version('0.1.0')
  .requiredOption('--spec <path>', 'Path or URL to OpenAPI 3.x spec (JSON or YAML)')
  .option('--base-url <url>', 'Override the base URL from the spec')
  .option('--auth <auth>', 'Auth string: "Bearer TOKEN", "HEADER:VALUE", or just a token')
  .option('--include <patterns...>', 'Only include paths matching these patterns (supports *)')
  .option('--exclude <patterns...>', 'Exclude paths matching these patterns (supports *)')
  .option('--transport <type>', 'Transport: stdio (default) or http', 'stdio')
  .option('--port <number>', 'Port for HTTP transport', '3100')
  .option('--no-flatten', 'Disable response flattening (return raw JSON)')
  .option('--verbose', 'Enable verbose logging to stderr', false)
  .action(async (opts) => {
    const config: ForgeConfig = {
      specPath: opts.spec,
      baseUrl: opts.baseUrl,
      auth: parseAuth(opts.auth ? resolveEnvVars(opts.auth) : undefined),
      include: opts.include,
      exclude: opts.exclude,
      transport: opts.transport as 'stdio' | 'http',
      port: parseInt(opts.port, 10),
      flatten: opts.flatten !== false,
      verbose: opts.verbose,
    };

    try {
      await startServer(config);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[mcpwrap] Error: ${message}`);
      process.exit(1);
    }
  });

program.parse();
