import type { ZodTypeAny } from 'zod';
import type { Targets } from 'zod-to-json-schema';
import { SchemaCompatLayer } from '../schema-compatibility.js';
import type { ModelInformation } from '../schema-compatibility.js';
export declare class AnthropicSchemaCompatLayer extends SchemaCompatLayer {
    constructor(model: ModelInformation);
    getSchemaTarget(): Targets | undefined;
    shouldApply(): boolean;
    processZodType(value: ZodTypeAny): ZodTypeAny;
}
//# sourceMappingURL=anthropic.d.ts.map