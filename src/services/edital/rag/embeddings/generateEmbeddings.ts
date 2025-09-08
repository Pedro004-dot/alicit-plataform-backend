import OpenAI from 'openai';
import { EditalChunk } from "../../../../repositories/editalRAGRepository";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbeddings(chunks: EditalChunk[]): Promise<EditalChunk[]> {
  console.log(`🤖 Gerando embeddings para ${chunks.length} chunks...`);
  
  const batchSize = 5;
  const chunksWithEmbeddings = [...chunks];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (chunk, batchIndex) => {
      const embedding = await generateEmbedding(chunk.text);
      chunksWithEmbeddings[i + batchIndex].embedding = embedding;
    }));
    
    console.log(`📊 Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)} processado`);
    
    // Rate limiting
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return chunksWithEmbeddings;
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("❌ Erro ao gerar embedding:", error);
    throw error;
  }
}