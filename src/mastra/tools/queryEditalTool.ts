import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { HybridSearch } from "../../services/edital/rag/search/HybridSearch";
import { PineconeStorage } from "../../services/edital/rag/storage/PineconeStorage";

// Instanciar dependências de forma lazy
let vectorStorage: PineconeStorage | null = null;
let hybridSearch: HybridSearch | null = null;
let initialized = false;

const initializeStorage = async () => {
  if (!initialized) {
    // Só instancia se as variáveis de ambiente estiverem configuradas
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY não configurado');
    }
    
    vectorStorage = new PineconeStorage();
    hybridSearch = new HybridSearch(vectorStorage);
    await vectorStorage.initialize();
    initialized = true;
  }
};

export const queryEditalDatabase = createTool({
  id: "queryEditalDatabase",
  description: "Consulta o banco de dados vetorial do edital para encontrar informações específicas",
  inputSchema: z.object({
    query: z.string().describe("Query de busca em linguagem natural"),
    licitacaoId: z.string().describe("ID da licitação para busca"),
    topK: z.number().optional().default(10).describe("Número máximo de resultados"),
  }),
  outputSchema: z.object({
    results: z.array(z.string()).describe("Trechos relevantes encontrados"),
    totalFound: z.number().describe("Total de resultados encontrados"),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`🔍 Tool: queryEditalDatabase - Buscando "${context.query}" em ${context.licitacaoId}`);
      
      // Garantir que PineconeStorage está inicializado
      await initializeStorage();
      
      if (!hybridSearch) {
        throw new Error('HybridSearch não inicializado');
      }
      
      const results = await hybridSearch.search(
        context.query, 
        context.licitacaoId, 
        context.topK
      );
      
      console.log(`📋 Tool: queryEditalDatabase - ${results.length} resultados encontrados`);
      
      return {
        results,
        totalFound: results.length,
      };
    } catch (error) {
      console.error("❌ Erro na tool queryEditalDatabase:", error);
      return {
        results: [],
        totalFound: 0,
      };
    }
  },
});