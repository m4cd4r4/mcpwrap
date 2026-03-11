import { describe, it, expect } from 'vitest';
import { flattenResponse } from '../src/proxy/response.js';

describe('Response Flattening', () => {
  it('returns string as-is', () => {
    expect(flattenResponse('hello')).toBe('hello');
  });

  it('returns "No content" for null/undefined', () => {
    expect(flattenResponse(null)).toBe('No content');
    expect(flattenResponse(undefined)).toBe('No content');
  });

  it('formats object as JSON', () => {
    const result = flattenResponse({ name: 'Rex', status: 'available' });
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('Rex');
    expect(parsed.status).toBe('available');
  });

  it('truncates arrays longer than 20 items', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const result = flattenResponse(data);
    const parsed = JSON.parse(result);
    expect(parsed.length).toBe(11); // 10 items + "... and 40 more items"
    expect(parsed[10]).toContain('40 more items');
  });

  it('truncates deeply nested objects', () => {
    const data = { a: { b: { c: { d: { e: 'deep' } } } } };
    const result = flattenResponse(data);
    const parsed = JSON.parse(result);
    expect(parsed.a.b.c).toBe('[truncated]');
  });
});
