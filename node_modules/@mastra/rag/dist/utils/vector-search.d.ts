import type { MastraVector, QueryResult } from '@mastra/core/vector';
import type { VectorFilter } from '@mastra/core/vector/filter';
import type { EmbeddingModel } from 'ai';
import type { DatabaseConfig } from '../tools/types.js';
interface VectorQuerySearchParams {
    indexName: string;
    vectorStore: MastraVector;
    queryText: string;
    model: EmbeddingModel<string>;
    queryFilter?: VectorFilter;
    topK: number;
    includeVectors?: boolean;
    maxRetries?: number;
    /** Database-specific configuration options */
    databaseConfig?: DatabaseConfig;
}
interface VectorQuerySearchResult {
    results: QueryResult[];
    queryEmbedding: number[];
}
export declare const vectorQuerySearch: ({ indexName, vectorStore, queryText, model, queryFilter, topK, includeVectors, maxRetries, databaseConfig, }: VectorQuerySearchParams) => Promise<VectorQuerySearchResult>;
export {};
//# sourceMappingURL=vector-search.d.ts.map