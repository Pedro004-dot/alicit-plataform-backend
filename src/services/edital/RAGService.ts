import { generateEditalHash } from "./hooks";
import { processDocuments } from "./rag/extract/processDocuments";
import { chunkDocuments } from "./rag/chunk/chunkDocuments";
import { PineconeStorage } from "./rag/storage/PineconeStorage";
import { HybridSearch } from "./rag/search/HybridSearch";
import downloadLicitacao, { DocumentFile } from "../licitacao/downloadLicitacao";
import { LicitacaoDocumentosService } from "../licitacao/licitacaoDocumentosService";

export interface EditalAnalysisRequest {
  licitacaoId: string;
  empresaId?: string; // Opcional
  empresaCNPJ?: string; // Opcional - CNPJ da empresa
  documents?: DocumentFile[]; // Para documentos locais (opcional)
}

export interface EditalAnalysisResult {
  licitacaoId: string;
  processed: boolean;
  editalHash: string;
  documentsCount: number;
  chunksCount: number;
}

export class EditalRAGService {
  private vectorStorage: PineconeStorage;
  private hybridSearch: HybridSearch;
  private licitacaoDocumentosService: LicitacaoDocumentosService;

  constructor() {
    this.vectorStorage = new PineconeStorage();
    this.hybridSearch = new HybridSearch(this.vectorStorage);
    this.licitacaoDocumentosService = new LicitacaoDocumentosService();
  }

  async initialize(): Promise<void> {
    await this.vectorStorage.initialize();
  }

  async processEdital(request: EditalAnalysisRequest): Promise<EditalAnalysisResult> {
    const { licitacaoId, empresaId } = request;

    const alreadyProcessed = await this.vectorStorage.isEditalProcessed(licitacaoId);
    //se o documento ja foi processado, puxa os vetores
    if (alreadyProcessed) {
      console.log(`✅ Edital ${licitacaoId} já processado, carregando embeddings existentes...`);
      await this.vectorStorage.loadEmbeddings(licitacaoId);
      return {
        licitacaoId,
        processed: false, // Indica que usou cache
        editalHash: 'cached',
        documentsCount: 0,
        chunksCount: 293, // TODO: Buscar valor real do Redis
      };
    }


    let documentsToProcess: DocumentFile[];

    try {
      
        documentsToProcess = await this.licitacaoDocumentosService.processarDocumentosLicitacao(licitacaoId);
        
        if (!documentsToProcess || documentsToProcess.length === 0) {
          throw new Error(`Nenhum documento encontrado para ${licitacaoId}`);
        }    
        
      } catch (downloadError) {
        console.error(`❌ Erro ao processar documentos:`, downloadError);
        throw new Error(`Falha ao processar documentos da licitação: ${downloadError}`);
      }
    

    // Preparar request para processDocuments com os documentos corretos
    const processRequest = {
      ...request,
      documents: documentsToProcess
    };
    
    // 1. Extrair texto dos documentos
    const editalDocuments = await processDocuments(processRequest);
   
    
    // 2. Chunking hierárquico
    const chunks = await chunkDocuments(editalDocuments);
    console.log(`🔧 Chunks criados: ${chunks.length}`);
    
    // 3. Gerar embeddings
    const chunksWithEmbeddings = await this.vectorStorage.generateEmbeddings(chunks);
    console.log(`🤖 Embeddings gerados: ${chunksWithEmbeddings.length}`);
    
    // 4. Salvar no VectorStorage
    await this.vectorStorage.saveChunks(chunksWithEmbeddings, licitacaoId);
    console.log(`💾 Chunks salvos no Pinecone`);
    
    // 5. Aguardar indexação do Pinecone (evita problemas de timing)
    console.log(`⏳ Aguardando 3 segundos para indexação do Pinecone...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    return {
      licitacaoId,
      processed: true,
      editalHash: generateEditalHash(empresaId),
      documentsCount: editalDocuments.length,
      chunksCount: chunks.length,
    };
  }

  async queryEdital(
    licitacaoId: string, 
    query: string, 
    topK: number = 10
  ): Promise<string[]> {
    // Usar nova busca híbrida
    return await this.hybridSearch.search(query, licitacaoId, topK, 0.7);
  }

  async isEditalProcessed(licitacaoId: string): Promise<boolean> {
    return await this.vectorStorage.isEditalProcessed(licitacaoId);
  }
}