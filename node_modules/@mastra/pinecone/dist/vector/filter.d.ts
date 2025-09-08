import { BaseFilterTranslator } from '@mastra/core/vector/filter';
import type { VectorFilter, OperatorSupport, OperatorValueMap, LogicalOperatorValueMap, BlacklistedRootOperators, FilterValue, OperatorCondition } from '@mastra/core/vector/filter';
type InitialOperatorValueMap = Omit<OperatorValueMap, '$regex' | '$options' | '$elemMatch' | '$all'> & {
    $contains: string;
    $gt: number | Date;
    $gte: number | Date;
    $lt: number | Date;
    $lte: number | Date;
};
type PineconeOperatorValueMap = InitialOperatorValueMap & {
    $all: OperatorCondition<keyof InitialOperatorValueMap, InitialOperatorValueMap>[] | FilterValue[];
};
type PineconeLogicalOperatorValueMap = Omit<LogicalOperatorValueMap, '$not' | '$nor'>;
type PineconeBlacklisted = BlacklistedRootOperators | '$not' | '$nor';
export type PineconeVectorFilter = VectorFilter<keyof PineconeOperatorValueMap, PineconeOperatorValueMap, PineconeLogicalOperatorValueMap, PineconeBlacklisted>;
export declare class PineconeFilterTranslator extends BaseFilterTranslator<PineconeVectorFilter> {
    protected getSupportedOperators(): OperatorSupport;
    translate(filter?: PineconeVectorFilter): PineconeVectorFilter;
    private translateNode;
    private translateOperator;
}
export {};
//# sourceMappingURL=filter.d.ts.map