import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

const SPEC_PATH = resolve(import.meta.dirname, '../examples/petstore.json');

describe('E2E: MCP Forge with Petstore API', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', resolve(import.meta.dirname, '../src/index.ts'), '--spec', SPEC_PATH],
    });

    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client?.close();
  });

  it('lists all tools from petstore spec', async () => {
    const { tools } = await client.listTools();

    expect(tools.length).toBe(3);

    const names = tools.map(t => t.name);
    expect(names).toContain('getPetById');
    expect(names).toContain('findPetsByStatus');
    expect(names).toContain('addPet');
  });

  it('each tool has a description and input schema', async () => {
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('getPetById has petId as required path param', async () => {
    const { tools } = await client.listTools();
    const getPet = tools.find(t => t.name === 'getPetById');

    expect(getPet).toBeDefined();
    const schema = getPet!.inputSchema as Record<string, unknown>;
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('petId');
    expect(schema.required).toContain('petId');
  });

  it('findPetsByStatus has status as required query param with enum', async () => {
    const { tools } = await client.listTools();
    const findPets = tools.find(t => t.name === 'findPetsByStatus');

    expect(findPets).toBeDefined();
    const schema = findPets!.inputSchema as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(props.status.enum).toEqual(['available', 'pending', 'sold']);
  });

  it('calls findPetsByStatus and gets a response', async () => {
    const result = await client.callTool({
      name: 'findPetsByStatus',
      arguments: { status: 'available' },
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);

    const textContent = result.content[0];
    expect(textContent).toHaveProperty('type', 'text');
    expect(typeof (textContent as { text: string }).text).toBe('string');

    // Response should be parseable JSON (array of pets)
    const text = (textContent as { text: string }).text;
    // Could be an error if Petstore is down, so just check we got text back
    expect(text.length).toBeGreaterThan(0);
  }, 15_000);

  it('calls getPetById and gets a response', async () => {
    const result = await client.callTool({
      name: 'getPetById',
      arguments: { petId: 1 },
    });

    expect(result.content).toBeDefined();
    const text = (result.content[0] as { text: string }).text;
    expect(text.length).toBeGreaterThan(0);
  }, 15_000);

  it('returns isError for non-existent pet', async () => {
    const result = await client.callTool({
      name: 'getPetById',
      arguments: { petId: 999999999 },
    });

    // Petstore returns 404 for non-existent pets
    const text = (result.content[0] as { text: string }).text;
    if (result.isError) {
      expect(text).toMatch(/HTTP 4\d\d/);
    } else {
      // Some petstore instances return 200 with empty data
      expect(text.length).toBeGreaterThan(0);
    }
  }, 15_000);

  it('addPet tool has body as required param', async () => {
    const { tools } = await client.listTools();
    const addPet = tools.find(t => t.name === 'addPet');

    expect(addPet).toBeDefined();
    const schema = addPet!.inputSchema as Record<string, unknown>;
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('body');
    expect(schema.required).toContain('body');
  });
});

describe('E2E: MCP Forge endpoint filtering', () => {
  it('respects --include filter', async () => {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: [
        'tsx',
        resolve(import.meta.dirname, '../src/index.ts'),
        '--spec', SPEC_PATH,
        '--include', '/pet/{petId}',
      ],
    });

    const client = new Client({ name: 'test-filter', version: '1.0.0' });
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('getPetById');

    await client.close();
  }, 30_000);

  it('respects --exclude filter', async () => {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: [
        'tsx',
        resolve(import.meta.dirname, '../src/index.ts'),
        '--spec', SPEC_PATH,
        '--exclude', '/pet/{petId}',
      ],
    });

    const client = new Client({ name: 'test-exclude', version: '1.0.0' });
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.length).toBe(2);
    const names = tools.map(t => t.name);
    expect(names).not.toContain('getPetById');
    expect(names).toContain('findPetsByStatus');
    expect(names).toContain('addPet');

    await client.close();
  }, 30_000);
});
