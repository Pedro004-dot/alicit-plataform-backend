import type { Schema } from 'ai';
import type { JSONSchema7 } from 'json-schema';
import type { z, ZodSchema } from 'zod';
import type { Targets } from 'zod-to-json-schema';
import type { SchemaCompatLayer } from './schema-compatibility.js';
/**
 * Converts a Zod schema to an AI SDK Schema with validation support.
 *
 * This function mirrors the behavior of Vercel's AI SDK zod-schema utility but allows
 * customization of the JSON Schema target format.
 *
 * @param zodSchema - The Zod schema to convert
 * @param target - The JSON Schema target format (defaults to 'jsonSchema7')
 * @returns An AI SDK Schema object with built-in validation
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { convertZodSchemaToAISDKSchema } from '@mastra/schema-compat';
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number().min(0)
 * });
 *
 * const aiSchema = convertZodSchemaToAISDKSchema(userSchema);
 * ```
 */
export declare function convertZodSchemaToAISDKSchema(zodSchema: ZodSchema, target?: Targets): Schema<any>;
/**
 * Converts an AI SDK Schema or Zod schema to a Zod schema.
 *
 * If the input is already a Zod schema, it returns it unchanged.
 * If the input is an AI SDK Schema, it extracts the JSON schema and converts it to Zod.
 *
 * @param schema - The schema to convert (AI SDK Schema or Zod schema)
 * @returns A Zod schema equivalent of the input
 * @throws Error if the conversion fails
 *
 * @example
 * ```typescript
 * import { jsonSchema } from 'ai';
 * import { convertSchemaToZod } from '@mastra/schema-compat';
 *
 * const aiSchema = jsonSchema({
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' }
 *   }
 * });
 *
 * const zodSchema = convertSchemaToZod(aiSchema);
 * ```
 */
export declare function convertSchemaToZod(schema: Schema | z.ZodSchema): z.ZodType;
/**
 * Processes a schema using provider compatibility layers and converts it to an AI SDK Schema.
 *
 * @param options - Configuration object for schema processing
 * @param options.schema - The schema to process (AI SDK Schema or Zod object schema)
 * @param options.compatLayers - Array of compatibility layers to try
 * @param options.mode - Must be 'aiSdkSchema'
 * @returns Processed schema as an AI SDK Schema
 */
export declare function applyCompatLayer(options: {
    schema: Schema | z.ZodSchema;
    compatLayers: SchemaCompatLayer[];
    mode: 'aiSdkSchema';
}): Schema;
/**
 * Processes a schema using provider compatibility layers and converts it to a JSON Schema.
 *
 * @param options - Configuration object for schema processing
 * @param options.schema - The schema to process (AI SDK Schema or Zod object schema)
 * @param options.compatLayers - Array of compatibility layers to try
 * @param options.mode - Must be 'jsonSchema'
 * @returns Processed schema as a JSONSchema7
 */
export declare function applyCompatLayer(options: {
    schema: Schema | z.ZodSchema;
    compatLayers: SchemaCompatLayer[];
    mode: 'jsonSchema';
}): JSONSchema7;
//# sourceMappingURL=utils.d.ts.map