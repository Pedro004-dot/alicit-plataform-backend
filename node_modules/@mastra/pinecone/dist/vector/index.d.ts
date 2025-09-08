import { MastraVector } from '@mastra/core/vector';
import type { QueryResult, IndexStats, CreateIndexParams, UpsertVectorParams, QueryVectorParams, DescribeIndexParams, DeleteIndexParams, DeleteVectorParams, UpdateVectorParams } from '@mastra/core/vector';
import type { IndexStatsDescription, RecordSparseValues } from '@pinecone-database/pinecone';
import type { PineconeVectorFilter } from './filter.js';
interface PineconeIndexStats extends IndexStats {
    namespaces?: IndexStatsDescription['namespaces'];
}
interface PineconeQueryVectorParams extends QueryVectorParams<PineconeVectorFilter> {
    namespace?: string;
    sparseVector?: RecordSparseValues;
}
interface PineconeUpsertVectorParams extends UpsertVectorParams {
    namespace?: string;
    sparseVectors?: RecordSparseValues[];
}
interface PineconeUpdateVectorParams extends UpdateVectorParams {
    namespace?: string;
}
interface PineconeDeleteVectorParams extends DeleteVectorParams {
    namespace?: string;
}
export declare class PineconeVector extends MastraVector<PineconeVectorFilter> {
    private client;
    /**
     * Creates a new PineconeVector client.
     * @param apiKey - The API key for Pinecone.
     * @param environment - The environment for Pinecone.
     */
    constructor({ apiKey, environment }: {
        apiKey: string;
        environment?: string;
    });
    get indexSeparator(): string;
    createIndex({ indexName, dimension, metric }: CreateIndexParams): Promise<void>;
    upsert({ indexName, vectors, metadata, ids, namespace, sparseVectors, }: PineconeUpsertVectorParams): Promise<string[]>;
    transformFilter(filter?: PineconeVectorFilter): PineconeVectorFilter;
    query({ indexName, queryVector, topK, filter, includeVector, namespace, sparseVector, }: PineconeQueryVectorParams): Promise<QueryResult[]>;
    listIndexes(): Promise<string[]>;
    /**
     * Retrieves statistics about a vector index.
     *
     * @param {string} indexName - The name of the index to describe
     * @returns A promise that resolves to the index statistics including dimension, count and metric
     */
    describeIndex({ indexName }: DescribeIndexParams): Promise<PineconeIndexStats>;
    deleteIndex({ indexName }: DeleteIndexParams): Promise<void>;
    /**
     * Updates a vector by its ID with the provided vector and/or metadata.
     * @param indexName - The name of the index containing the vector.
     * @param id - The ID of the vector to update.
     * @param update - An object containing the vector and/or metadata to update.
     * @param update.vector - An optional array of numbers representing the new vector.
     * @param update.metadata - An optional record containing the new metadata.
     * @param namespace - The namespace of the index (optional).
     * @returns A promise that resolves when the update is complete.
     * @throws Will throw an error if no updates are provided or if the update operation fails.
     */
    updateVector({ indexName, id, update, namespace }: PineconeUpdateVectorParams): Promise<void>;
    /**
     * Deletes a vector by its ID.
     * @param indexName - The name of the index containing the vector.
     * @param id - The ID of the vector to delete.
     * @param namespace - The namespace of the index (optional).
     * @returns A promise that resolves when the deletion is complete.
     * @throws Will throw an error if the deletion operation fails.
     */
    deleteVector({ indexName, id, namespace }: PineconeDeleteVectorParams): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map