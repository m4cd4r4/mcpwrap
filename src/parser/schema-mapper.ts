import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

type V3Parameter = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type V3Schema = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
type V3RequestBody = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;

export function mapParameterSchema(param: V3Parameter): Record<string, unknown> {
  const schema = (param.schema ?? {}) as V3Schema;
  const result: Record<string, unknown> = {
    type: schema.type ?? 'string',
  };

  if (param.description || schema.description) {
    result.description = param.description ?? schema.description;
  }
  if (schema.enum) result.enum = schema.enum;
  if (schema.default !== undefined) result.default = schema.default;
  if (schema.format) result.format = schema.format;
  if (schema.minimum !== undefined) result.minimum = schema.minimum;
  if (schema.maximum !== undefined) result.maximum = schema.maximum;

  if (schema.type === 'array' && schema.items) {
    result.items = mapSchemaObject(schema.items as V3Schema);
  }

  return result;
}

export function mapRequestBodySchema(
  requestBody: V3RequestBody
): Record<string, unknown> | null {
  const content = requestBody.content;
  if (!content) return null;

  const mediaType = content['application/json'] ?? Object.values(content)[0];
  if (!mediaType?.schema) return null;

  const schema = mediaType.schema as V3Schema;
  const mapped = mapSchemaObject(schema);

  if (requestBody.description) {
    mapped.description = requestBody.description;
  }

  return mapped;
}

function mapSchemaObject(schema: V3Schema): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (schema.type) result.type = schema.type;
  if (schema.description) result.description = schema.description;
  if (schema.enum) result.enum = schema.enum;
  if (schema.default !== undefined) result.default = schema.default;
  if (schema.format) result.format = schema.format;

  if (schema.type === 'object' && schema.properties) {
    const properties: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      properties[key] = mapSchemaObject(propSchema as V3Schema);
    }
    result.properties = properties;
    if (schema.required) result.required = schema.required;
  }

  if (schema.type === 'array' && schema.items) {
    result.items = mapSchemaObject(schema.items as V3Schema);
  }

  return result;
}
