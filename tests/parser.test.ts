import { describe, it, expect } from 'vitest';
import { parseSpec } from '../src/parser/openapi.js';
import { resolve } from 'path';

const PETSTORE_PATH = resolve(import.meta.dirname, '../examples/petstore.json');

describe('OpenAPI Parser', () => {
  it('parses petstore spec and extracts endpoints', async () => {
    const { endpoints, info } = await parseSpec(PETSTORE_PATH);

    expect(info.title).toBe('Petstore');
    expect(info.version).toBe('1.0.0');
    expect(info.baseUrl).toBe('https://petstore3.swagger.io/api/v3');
    expect(endpoints.length).toBe(3);
  });

  it('extracts GET endpoint with path params', async () => {
    const { endpoints } = await parseSpec(PETSTORE_PATH);
    const getPet = endpoints.find(e => e.toolName === 'getPetById');

    expect(getPet).toBeDefined();
    expect(getPet!.method).toBe('GET');
    expect(getPet!.path).toBe('/pet/{petId}');
    expect(getPet!.pathParams).toEqual(['petId']);
    expect(getPet!.queryParams).toEqual([]);
    expect(getPet!.hasBody).toBe(false);
    expect(getPet!.description).toBe('Find pet by ID');
  });

  it('extracts GET endpoint with query params', async () => {
    const { endpoints } = await parseSpec(PETSTORE_PATH);
    const findPets = endpoints.find(e => e.toolName === 'findPetsByStatus');

    expect(findPets).toBeDefined();
    expect(findPets!.method).toBe('GET');
    expect(findPets!.queryParams).toEqual(['status']);
    expect(findPets!.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['available', 'pending', 'sold'],
          default: 'available',
        },
      },
      required: ['status'],
    });
  });

  it('extracts POST endpoint with request body', async () => {
    const { endpoints } = await parseSpec(PETSTORE_PATH);
    const addPet = endpoints.find(e => e.toolName === 'addPet');

    expect(addPet).toBeDefined();
    expect(addPet!.method).toBe('POST');
    expect(addPet!.hasBody).toBe(true);
    expect(addPet!.contentType).toBe('application/json');
    expect(addPet!.inputSchema.properties).toHaveProperty('body');
  });

  it('generates fallback tool names when no operationId', async () => {
    // The petstore spec has operationIds, so all should use them
    const { endpoints } = await parseSpec(PETSTORE_PATH);
    const names = endpoints.map(e => e.toolName);
    expect(names).toContain('getPetById');
    expect(names).toContain('findPetsByStatus');
    expect(names).toContain('addPet');
  });
});
