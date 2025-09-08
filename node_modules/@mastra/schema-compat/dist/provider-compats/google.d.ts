import type { ZodTypeAny } from 'zod';
import type { Targets } from 'zod-to-json-schema';
import type { ModelInformation } from '../schema-compatibility.js';
import { SchemaCompatLayer } from '../schema-compatibility.js';
export declare class GoogleSchemaCompatLayer extends SchemaCompatLayer {
    constructor(model: ModelInformation);
    getSchemaTarget(): Targets | undefined;
    shouldApply(): boolean;
    processZodType(value: ZodTypeAny): ZodTypeAny;
}
//# sourceMappingURL=google.d.ts.map