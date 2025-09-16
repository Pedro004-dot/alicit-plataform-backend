import { PineconeVector } from '@mastra/pinecone';

/**
 * Configuração do Vector Store Pinecone seguindo padrões Mastra
 */
export const pineconeVectorStore = new PineconeVector({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const PINECONE_CONFIG = {
  indexName: process.env.PINECONE_INDEX_NAME || 'alicit-editais',
  dimension: 1536, // text-embedding-3-small
  metric: 'cosine' as const,
  namespace: '' // Usar namespace vazio para acessar dados existentes
} as const;

/**
 * Inicializar índice Pinecone se não existir
 */
export async function initializePineconeIndex() {
  try {
    console.log('🔄 Verificando índice Pinecone...');
    
    // Verificar se temos API key
    if (!process.env.PINECONE_API_KEY) {
      console.warn('⚠️ PINECONE_API_KEY não configurada - vector search será desabilitado');
      return false;
    }
    
    const indexes = await pineconeVectorStore.listIndexes();
    const indexExists = indexes.includes(PINECONE_CONFIG.indexName);
    
    if (!indexExists) {
      console.log(`🔧 Criando índice: ${PINECONE_CONFIG.indexName}`);
      await pineconeVectorStore.createIndex({
        indexName: PINECONE_CONFIG.indexName,
        dimension: PINECONE_CONFIG.dimension,
        metric: PINECONE_CONFIG.metric
      });
      console.log('✅ Índice Pinecone criado com sucesso');
    } else {
      console.log('✅ Índice Pinecone já existe');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar índice Pinecone:', error);
    return false;
  }
}