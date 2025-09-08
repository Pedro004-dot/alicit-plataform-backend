"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// Desabilitar telemetria do Mastra
globalThis.___MASTRA_TELEMETRY___ = true;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const licitacaoRoutes_1 = __importDefault(require("./routes/licitacaoRoutes"));
const analysisRoutes_1 = __importDefault(require("./routes/analysisRoutes"));
const empresaRoutes_1 = __importDefault(require("./routes/empresaRoutes"));
const licitacaoDocumentosRoutes_1 = __importDefault(require("./routes/licitacaoDocumentosRoutes"));
const relatoriosRoutes_1 = __importDefault(require("./routes/relatoriosRoutes"));
const pineconeRepository_1 = require("./repositories/pineconeRepository");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const app = (0, express_1.default)();
const PORT = 3002;
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.json({ message: 'Servidor rodando!' });
});
app.use('/licitacoes', licitacaoRoutes_1.default);
app.use('/licitacoes-documentos', licitacaoDocumentosRoutes_1.default);
app.use('/edital', analysisRoutes_1.default);
app.use('/relatorios', relatoriosRoutes_1.default);
app.use('/empresa', empresaRoutes_1.default);
app.use('/user', userRoutes_1.default);
app.use('/auth', authRoutes_1.default);
// Inicializar Pinecone no startup  
const initializePinecone = async () => {
    try {
        if (process.env.PINECONE_API_KEY) {
            const pineconeRepo = new pineconeRepository_1.PineconeRepository();
            await pineconeRepo.initialize();
        }
        else {
            console.log('⚠️ PINECONE_API_KEY não configurada - Pinecone não será inicializado');
        }
    }
    catch (error) {
        console.error('❌ Erro ao inicializar Pinecone:', error);
        console.log('⚠️ Sistema continuará funcionando sem Pinecone - funcionalidades de RAG podem ficar limitadas');
    }
};
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    await initializePinecone();
});
