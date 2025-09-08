"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalRAGService = void 0;
const hooks_1 = require("./hooks");
const processDocuments_1 = require("./rag/extract/processDocuments");
const chunkDocuments_1 = require("./rag/chunk/chunkDocuments");
const PineconeStorage_1 = require("./rag/storage/PineconeStorage");
const HybridSearch_1 = require("./rag/search/HybridSearch");
const licitacaoDocumentosService_1 = require("../licitacao/licitacaoDocumentosService");
class EditalRAGService {
    constructor() {
        this.vectorStorage = new PineconeStorage_1.PineconeStorage();
        this.hybridSearch = new HybridSearch_1.HybridSearch(this.vectorStorage);
        this.licitacaoDocumentosService = new licitacaoDocumentosService_1.LicitacaoDocumentosService();
    }
    async initialize() {
        await this.vectorStorage.initialize();
    }
    async processEdital(request) {
        const { licitacaoId, empresaId } = request;
        const alreadyProcessed = await this.vectorStorage.isEditalProcessed(licitacaoId);
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
        console.log(`🔧 Processando edital ${licitacaoId} pela primeira vez...`);
        let documentsToProcess;
        if (request.documents && request.documents.length > 0) {
            console.log(`📄 Usando ${request.documents.length} documentos fornecidos localmente`);
            documentsToProcess = request.documents;
        }
        else {
            console.log(`📥 Processando documentos para licitação ${licitacaoId}...`);
            try {
                documentsToProcess = await this.licitacaoDocumentosService.processarDocumentosLicitacao(licitacaoId);
                if (!documentsToProcess || documentsToProcess.length === 0) {
                    throw new Error(`Nenhum documento encontrado para ${licitacaoId}`);
                }
                console.log(`📥 ${documentsToProcess.length} documento(s) obtido(s) para processamento`);
            }
            catch (downloadError) {
                console.error(`❌ Erro ao processar documentos:`, downloadError);
                throw new Error(`Falha ao processar documentos da licitação: ${downloadError}`);
            }
        }
        // Preparar request para processDocuments com os documentos corretos
        const processRequest = {
            ...request,
            documents: documentsToProcess
        };
        // 1. Extrair texto dos documentos
        const editalDocuments = await (0, processDocuments_1.processDocuments)(processRequest);
        console.log(`📋 Documentos processados: ${editalDocuments.length}`);
        console.log(`📊 Total caracteres extraídos: ${editalDocuments.reduce((sum, doc) => sum + doc.text.length, 0)}`);
        // 2. Chunking hierárquico
        const chunks = await (0, chunkDocuments_1.chunkDocuments)(editalDocuments);
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
            editalHash: (0, hooks_1.generateEditalHash)(empresaId),
            documentsCount: editalDocuments.length,
            chunksCount: chunks.length,
        };
    }
    async queryEdital(licitacaoId, query, topK = 10) {
        // Usar nova busca híbrida
        return await this.hybridSearch.search(query, licitacaoId, topK, 0.7);
    }
    async isEditalProcessed(licitacaoId) {
        return await this.vectorStorage.isEditalProcessed(licitacaoId);
    }
}
exports.EditalRAGService = EditalRAGService;
