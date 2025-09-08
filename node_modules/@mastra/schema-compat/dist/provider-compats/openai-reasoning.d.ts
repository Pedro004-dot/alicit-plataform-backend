import type { ZodTypeAny } from 'zod';
import type { Targets } from 'zod-to-json-schema';
import type { ModelInformation } from '../schema-compatibility.js';
import { SchemaCompatLayer } from '../schema-compatibility.js';
export declare class OpenAIReasoningSchemaCompatLayer extends SchemaCompatLayer {
    constructor(model: ModelInformation);
    getSchemaTarget(): Targets | undefined;
    isReasoningModel(): boolean;
    shouldApply(): boolean;
    processZodType(value: ZodTypeAny): ZodTypeAny;
}
//# sourceMappingURL=openai-reasoning.d.ts.map