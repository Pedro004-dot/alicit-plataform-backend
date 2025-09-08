import { MastraError, ErrorCategory, ErrorDomain } from '@mastra/core/error';
import { MastraVector } from '@mastra/core/vector';
import { Pinecone } from '@pinecone-database/pinecone';
import { BaseFilterTranslator } from '@mastra/core/vector/filter';

// src/vector/index.ts
var PineconeFilterTranslator = class extends BaseFilterTranslator {
  getSupportedOperators() {
    return {
      ...BaseFilterTranslator.DEFAULT_OPERATORS,
      logical: ["$and", "$or"],
      array: ["$in", "$all", "$nin"],
      element: ["$exists"],
      regex: [],
      custom: []
    };
  }
  translate(filter) {
    if (this.isEmpty(filter)) return filter;
    this.validateFilter(filter);
    return this.translateNode(filter);
  }
  translateNode(node, currentPath = "") {
    if (this.isRegex(node)) {
      throw new Error("Regex is not supported in Pinecone");
    }
    if (this.isPrimitive(node)) return this.normalizeComparisonValue(node);
    if (Array.isArray(node)) return { $in: this.normalizeArrayValues(node) };
    const entries = Object.entries(node);
    const firstEntry = entries[0];
    if (entries.length === 1 && firstEntry && this.isOperator(firstEntry[0])) {
      const [operator, value] = firstEntry;
      const translated = this.translateOperator(operator, value, currentPath);
      return this.isLogicalOperator(operator) ? { [operator]: translated } : translated;
    }
    const result = {};
    for (const [key, value] of entries) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (this.isOperator(key)) {
        result[key] = this.translateOperator(key, value, currentPath);
        continue;
      }
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        if (Object.keys(value).length === 1 && "$all" in value) {
          const translated = this.translateNode(value, key);
          if (translated.$and) {
            return translated;
          }
        }
        if (Object.keys(value).length === 0) {
          result[newPath] = this.translateNode(value);
        } else {
          const hasOperators = Object.keys(value).some((k) => this.isOperator(k));
          if (hasOperators) {
            const normalizedValue = {};
            for (const [op, opValue] of Object.entries(value)) {
              normalizedValue[op] = this.isOperator(op) ? this.translateOperator(op, opValue) : opValue;
            }
            result[newPath] = normalizedValue;
          } else {
            Object.assign(result, this.translateNode(value, newPath));
          }
        }
      } else {
        result[newPath] = this.translateNode(value);
      }
    }
    return result;
  }
  translateOperator(operator, value, currentPath = "") {
    if (operator === "$all") {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("A non-empty array is required for the $all operator");
      }
      return this.simulateAllOperator(currentPath, value);
    }
    if (this.isLogicalOperator(operator)) {
      return Array.isArray(value) ? value.map((item) => this.translateNode(item)) : this.translateNode(value);
    }
    return this.normalizeComparisonValue(value);
  }
};

// src/vector/index.ts
var PineconeVector = class extends MastraVector {
  client;
  /**
   * Creates a new PineconeVector client.
   * @param apiKey - The API key for Pinecone.
   * @param environment - The environment for Pinecone.
   */
  constructor({ apiKey, environment }) {
    super();
    const opts = { apiKey };
    if (environment) {
      opts["controllerHostUrl"] = environment;
    }
    const baseClient = new Pinecone(opts);
    const telemetry = this.__getTelemetry();
    this.client = telemetry?.traceClass(baseClient, {
      spanNamePrefix: "pinecone-vector",
      attributes: {
        "vector.type": "pinecone"
      }
    }) ?? baseClient;
  }
  get indexSeparator() {
    return "-";
  }
  async createIndex({ indexName, dimension, metric = "cosine" }) {
    try {
      if (!Number.isInteger(dimension) || dimension <= 0) {
        throw new Error("Dimension must be a positive integer");
      }
      if (metric && !["cosine", "euclidean", "dotproduct"].includes(metric)) {
        throw new Error("Metric must be one of: cosine, euclidean, dotproduct");
      }
    } catch (validationError) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_CREATE_INDEX_INVALID_ARGS",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.USER,
          details: { indexName, dimension, metric }
        },
        validationError
      );
    }
    try {
      await this.client.createIndex({
        name: indexName,
        dimension,
        metric,
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1"
          }
        }
      });
    } catch (error) {
      const message = error?.errors?.[0]?.message || error?.message;
      if (error.status === 409 || typeof message === "string" && (message.toLowerCase().includes("already exists") || message.toLowerCase().includes("duplicate"))) {
        await this.validateExistingIndex(indexName, dimension, metric);
        return;
      }
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_CREATE_INDEX_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName, dimension, metric }
        },
        error
      );
    }
  }
  async upsert({
    indexName,
    vectors,
    metadata,
    ids,
    namespace,
    sparseVectors
  }) {
    const index = this.client.Index(indexName).namespace(namespace || "");
    const vectorIds = ids || vectors.map(() => crypto.randomUUID());
    const records = vectors.map((vector, i) => ({
      id: vectorIds[i],
      values: vector,
      ...sparseVectors?.[i] && { sparseValues: sparseVectors?.[i] },
      metadata: metadata?.[i] || {}
    }));
    const batchSize = 100;
    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await index.upsert(batch);
      }
      return vectorIds;
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_UPSERT_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName, vectorCount: vectors.length }
        },
        error
      );
    }
  }
  transformFilter(filter) {
    const translator = new PineconeFilterTranslator();
    return translator.translate(filter);
  }
  async query({
    indexName,
    queryVector,
    topK = 10,
    filter,
    includeVector = false,
    namespace,
    sparseVector
  }) {
    const index = this.client.Index(indexName).namespace(namespace || "");
    const translatedFilter = this.transformFilter(filter) ?? void 0;
    const queryParams = {
      vector: queryVector,
      topK,
      includeMetadata: true,
      includeValues: includeVector,
      filter: translatedFilter
    };
    if (sparseVector) {
      queryParams.sparseVector = sparseVector;
    }
    try {
      const results = await index.query(queryParams);
      return results.matches.map((match) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata,
        ...includeVector && { vector: match.values || [] }
      }));
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_QUERY_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName, topK }
        },
        error
      );
    }
  }
  async listIndexes() {
    try {
      const indexesResult = await this.client.listIndexes();
      return indexesResult?.indexes?.map((index) => index.name) || [];
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_LIST_INDEXES_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY
        },
        error
      );
    }
  }
  /**
   * Retrieves statistics about a vector index.
   *
   * @param {string} indexName - The name of the index to describe
   * @returns A promise that resolves to the index statistics including dimension, count and metric
   */
  async describeIndex({ indexName }) {
    try {
      const index = this.client.Index(indexName);
      const stats = await index.describeIndexStats();
      const description = await this.client.describeIndex(indexName);
      return {
        dimension: description.dimension,
        count: stats.totalRecordCount || 0,
        metric: description.metric,
        namespaces: stats.namespaces
      };
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_DESCRIBE_INDEX_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName }
        },
        error
      );
    }
  }
  async deleteIndex({ indexName }) {
    try {
      await this.client.deleteIndex(indexName);
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_DELETE_INDEX_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName }
        },
        error
      );
    }
  }
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
  async updateVector({ indexName, id, update, namespace }) {
    if (!update.vector && !update.metadata) {
      throw new MastraError({
        id: "STORAGE_PINECONE_VECTOR_UPDATE_VECTOR_INVALID_ARGS",
        domain: ErrorDomain.STORAGE,
        category: ErrorCategory.USER,
        text: "No updates provided",
        details: { indexName, id }
      });
    }
    try {
      const index = this.client.Index(indexName).namespace(namespace || "");
      const updateObj = { id };
      if (update.vector) {
        updateObj.values = update.vector;
      }
      if (update.metadata) {
        updateObj.metadata = update.metadata;
      }
      await index.update(updateObj);
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_UPDATE_VECTOR_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName, id }
        },
        error
      );
    }
  }
  /**
   * Deletes a vector by its ID.
   * @param indexName - The name of the index containing the vector.
   * @param id - The ID of the vector to delete.
   * @param namespace - The namespace of the index (optional).
   * @returns A promise that resolves when the deletion is complete.
   * @throws Will throw an error if the deletion operation fails.
   */
  async deleteVector({ indexName, id, namespace }) {
    try {
      const index = this.client.Index(indexName).namespace(namespace || "");
      await index.deleteOne(id);
    } catch (error) {
      throw new MastraError(
        {
          id: "STORAGE_PINECONE_VECTOR_DELETE_VECTOR_FAILED",
          domain: ErrorDomain.STORAGE,
          category: ErrorCategory.THIRD_PARTY,
          details: { indexName, id }
        },
        error
      );
    }
  }
};

// src/vector/prompt.ts
var PINECONE_PROMPT = `When querying Pinecone, you can ONLY use the operators listed below. Any other operators will be rejected.
Important: Don't explain how to construct the filter - use the specified operators and fields to search the content and return relevant results.
If a user tries to give an explicit operator that is not supported, reject the filter entirely and let them know that the operator is not supported.

Basic Comparison Operators:
- $eq: Exact match (default when using field: value)
  Example: { "category": "electronics" }
- $ne: Not equal
  Example: { "category": { "$ne": "electronics" } }
- $gt: Greater than
  Example: { "price": { "$gt": 100 } }
- $gte: Greater than or equal
  Example: { "price": { "$gte": 100 } }
- $lt: Less than
  Example: { "price": { "$lt": 100 } }
- $lte: Less than or equal
  Example: { "price": { "$lte": 100 } }

Array Operators:
- $in: Match any value in array
  Example: { "category": { "$in": ["electronics", "books"] } }
- $nin: Does not match any value in array
  Example: { "category": { "$nin": ["electronics", "books"] } }
- $all: Match all values in array
  Example: { "tags": { "$all": ["premium", "sale"] } }

Logical Operators:
- $and: Logical AND (can be implicit or explicit)
  Implicit Example: { "price": { "$gt": 100 }, "category": "electronics" }
  Explicit Example: { "$and": [{ "price": { "$gt": 100 } }, { "category": "electronics" }] }
- $or: Logical OR
  Example: { "$or": [{ "price": { "$lt": 50 } }, { "category": "books" }] }

Element Operators:
- $exists: Check if field exists
  Example: { "rating": { "$exists": true } }

Restrictions:
- Regex patterns are not supported
- Only $and and $or logical operators are supported at the top level
- Empty arrays in $in/$nin will return no results
- A non-empty array is required for $all operator
- Nested fields are supported using dot notation
- Multiple conditions on the same field are supported with both implicit and explicit $and
- At least one key-value pair is required in filter object
- Empty objects and undefined values are treated as no filter
- Invalid types in comparison operators will throw errors
- All non-logical operators must be used within a field condition
  Valid: { "field": { "$gt": 100 } }
  Valid: { "$and": [...] }
  Invalid: { "$gt": 100 }
- Logical operators must contain field conditions, not direct operators
  Valid: { "$and": [{ "field": { "$gt": 100 } }] }
  Invalid: { "$and": [{ "$gt": 100 }] }
- Logical operators ($and, $or):
  - Can only be used at top level or nested within other logical operators
  - Can not be used on a field level, or be nested inside a field
  - Can not be used inside an operator
  - Valid: { "$and": [{ "field": { "$gt": 100 } }] }
  - Valid: { "$or": [{ "$and": [{ "field": { "$gt": 100 } }] }] }
  - Invalid: { "field": { "$and": [{ "$gt": 100 }] } }
  - Invalid: { "field": { "$or": [{ "$gt": 100 }] } }
  - Invalid: { "field": { "$gt": { "$and": [{...}] } } }

Example Complex Query:
{
  "$and": [
    { "category": { "$in": ["electronics", "computers"] } },
    { "price": { "$gte": 100, "$lte": 1000 } },
    { "tags": { "$all": ["premium", "sale"] } },
    { "rating": { "$exists": true, "$gt": 4 } },
    { "$or": [
      { "stock": { "$gt": 0 } },
      { "preorder": true }
    ]}
  ]
}`;

export { PINECONE_PROMPT, PineconeVector };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map