export function flattenResponse(data: unknown, maxDepth = 3): string {
  if (data === null || data === undefined) return 'No content';
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return String(data);

  try {
    const simplified = simplify(data, 0, maxDepth);
    return JSON.stringify(simplified, null, 2);
  } catch {
    return JSON.stringify(data, null, 2);
  }
}

function simplify(obj: unknown, depth: number, maxDepth: number): unknown {
  if (depth >= maxDepth) return '[truncated]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    if (obj.length > 20) {
      const items = obj.slice(0, 10).map(item => simplify(item, depth + 1, maxDepth));
      return [...items, `... and ${obj.length - 10} more items`];
    }
    return obj.map(item => simplify(item, depth + 1, maxDepth));
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(obj as Record<string, unknown>);

  for (const [key, value] of entries) {
    result[key] = simplify(value, depth + 1, maxDepth);
  }

  return result;
}
