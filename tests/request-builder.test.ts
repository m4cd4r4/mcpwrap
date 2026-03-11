import { describe, it, expect } from 'vitest';
import { buildRequest } from '../src/proxy/request-builder.js';
import type { ParsedEndpoint } from '../src/parser/openapi.js';

const baseUrl = 'https://api.example.com';

describe('Request Builder', () => {
  it('builds GET request with path params', () => {
    const endpoint: ParsedEndpoint = {
      toolName: 'getPet',
      description: 'Get a pet',
      method: 'GET',
      path: '/pets/{petId}',
      inputSchema: {},
      pathParams: ['petId'],
      queryParams: [],
      hasBody: false,
      contentType: 'application/json',
    };

    const req = buildRequest(endpoint, { petId: 42 }, baseUrl);

    expect(req.url).toBe('https://api.example.com/pets/42');
    expect(req.method).toBe('GET');
    expect(req.body).toBeUndefined();
  });

  it('builds GET request with query params', () => {
    const endpoint: ParsedEndpoint = {
      toolName: 'listPets',
      description: 'List pets',
      method: 'GET',
      path: '/pets',
      inputSchema: {},
      pathParams: [],
      queryParams: ['status', 'limit'],
      hasBody: false,
      contentType: 'application/json',
    };

    const req = buildRequest(endpoint, { status: 'available', limit: 10 }, baseUrl);

    expect(req.url).toBe('https://api.example.com/pets?status=available&limit=10');
  });

  it('builds POST request with body', () => {
    const endpoint: ParsedEndpoint = {
      toolName: 'addPet',
      description: 'Add a pet',
      method: 'POST',
      path: '/pets',
      inputSchema: {},
      pathParams: [],
      queryParams: [],
      hasBody: true,
      contentType: 'application/json',
    };

    const req = buildRequest(endpoint, { body: { name: 'Rex' } }, baseUrl);

    expect(req.method).toBe('POST');
    expect(req.headers['Content-Type']).toBe('application/json');
    expect(req.body).toBe('{"name":"Rex"}');
  });

  it('adds Bearer auth headers', () => {
    const endpoint: ParsedEndpoint = {
      toolName: 'getPet',
      description: 'Get a pet',
      method: 'GET',
      path: '/pets/{petId}',
      inputSchema: {},
      pathParams: ['petId'],
      queryParams: [],
      hasBody: false,
      contentType: 'application/json',
    };

    const req = buildRequest(endpoint, { petId: 1 }, baseUrl, {
      type: 'bearer',
      value: 'my-token',
    });

    expect(req.headers['Authorization']).toBe('Bearer my-token');
  });

  it('adds API key auth headers', () => {
    const endpoint: ParsedEndpoint = {
      toolName: 'getPet',
      description: 'Get a pet',
      method: 'GET',
      path: '/pets/{petId}',
      inputSchema: {},
      pathParams: ['petId'],
      queryParams: [],
      hasBody: false,
      contentType: 'application/json',
    };

    const req = buildRequest(endpoint, { petId: 1 }, baseUrl, {
      type: 'api-key',
      value: 'key123',
      header: 'X-Custom-Key',
    });

    expect(req.headers['X-Custom-Key']).toBe('key123');
  });

  it('skips undefined query params', () => {
    const endpoint: ParsedEndpoint = {
      toolName: 'listPets',
      description: 'List pets',
      method: 'GET',
      path: '/pets',
      inputSchema: {},
      pathParams: [],
      queryParams: ['status', 'limit'],
      hasBody: false,
      contentType: 'application/json',
    };

    const req = buildRequest(endpoint, { status: 'available' }, baseUrl);

    expect(req.url).toBe('https://api.example.com/pets?status=available');
  });
});
