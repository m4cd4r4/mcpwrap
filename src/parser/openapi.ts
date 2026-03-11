import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { mapParameterSchema, mapRequestBodySchema } from './schema-mapper.js';

export interface ParsedEndpoint {
  toolName: string;
  description: string;
  method: string;
  path: string;
  inputSchema: Record<string, unknown>;
  pathParams: string[];
  queryParams: string[];
  hasBody: boolean;
  contentType: string;
}

type V3Document = OpenAPIV3.Document | OpenAPIV3_1.Document;
type V3Operation = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type V3Parameter = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export async function parseSpec(specPath: string): Promise<{
  endpoints: ParsedEndpoint[];
  info: { title: string; version: string; baseUrl: string };
}> {
  const api = await SwaggerParser.dereference(specPath) as V3Document;

  const title = api.info?.title ?? 'API';
  const version = api.info?.version ?? '1.0.0';
  const baseUrl = extractBaseUrl(api);

  const endpoints: ParsedEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(api.paths ?? {})) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as V3Operation | undefined;
      if (!operation) continue;

      const endpoint = parseEndpoint(method, path, operation);
      endpoints.push(endpoint);
    }
  }

  return { endpoints, info: { title, version, baseUrl } };
}

function parseEndpoint(
  method: string,
  path: string,
  operation: V3Operation
): ParsedEndpoint {
  const toolName = buildToolName(method, path, operation.operationId);
  const description = buildDescription(method, path, operation);

  const parameters = (operation.parameters ?? []) as V3Parameter[];
  const pathParams = parameters.filter(p => p.in === 'path');
  const queryParams = parameters.filter(p => p.in === 'query');

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of pathParams) {
    properties[param.name] = mapParameterSchema(param);
    if (param.required) required.push(param.name);
  }

  for (const param of queryParams) {
    properties[param.name] = mapParameterSchema(param);
    if (param.required) required.push(param.name);
  }

  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  const hasBody = !!requestBody;
  let contentType = 'application/json';

  if (hasBody && requestBody?.content) {
    contentType = Object.keys(requestBody.content)[0] ?? 'application/json';
    const bodySchema = mapRequestBodySchema(requestBody);
    if (bodySchema) {
      properties['body'] = bodySchema;
      if (requestBody.required) required.push('body');
    }
  }

  const inputSchema: Record<string, unknown> = {
    type: 'object',
    properties,
  };
  if (required.length > 0) {
    inputSchema.required = required;
  }

  return {
    toolName,
    description,
    method: method.toUpperCase(),
    path,
    inputSchema,
    pathParams: pathParams.map(p => p.name),
    queryParams: queryParams.map(p => p.name),
    hasBody,
    contentType,
  };
}

function buildToolName(method: string, path: string, operationId?: string): string {
  if (operationId) {
    return sanitizeName(operationId);
  }

  const segments = path
    .split('/')
    .filter(Boolean)
    .map(s => s.replace(/[{}]/g, ''))
    .join('_');

  return sanitizeName(`${method}_${segments}`);
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}

function buildDescription(method: string, path: string, operation: V3Operation): string {
  if (operation.summary) return operation.summary;
  if (operation.description) {
    return operation.description.length > 200
      ? operation.description.slice(0, 197) + '...'
      : operation.description;
  }
  return `${method.toUpperCase()} ${path}`;
}

function extractBaseUrl(api: V3Document): string {
  const servers = api.servers;
  if (servers && servers.length > 0) {
    return servers[0].url;
  }
  return '';
}
