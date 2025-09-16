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
const PORT = parseInt(process.env.PORT || '3002', 10);
// Configuração CORS para suportar múltiplos ambientes
const allowedOrigins = [
    'http://localhost:3000',
    'https://alicitplataform.vercel.app',
    process.env.CORS_ORIGIN
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permite requisições sem origin (apps mobile, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log(`CORS bloqueou origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Health check para Vercel
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ALICIT Backend API is running',
        service: 'alicit-backend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'alicit-backend',
        timestamp: new Date().toISOString()
    });
});
app.use('/licitacoes', licitacaoRoutes_1.default);
app.use('/licitacoes-documentos', licitacaoDocumentosRoutes_1.default);
app.use('/edital', analysisRoutes_1.default);
app.use('/relatorios', relatoriosRoutes_1.default);
app.use('/empresa', empresaRoutes_1.default);
app.use('/user', userRoutes_1.default);
app.use('/auth', authRoutes_1.default);
// Error handler para debugging no Vercel
app.use((error, req, res, next) => {
    console.error('❌ Server Error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
});
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
// Inicializar Pinecone de forma assíncrona para Vercel
const initApp = async () => {
    await initializePinecone();
    return app;
};
// Iniciar servidor sempre (Railway, desenvolvimento, etc)
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    // Inicializar serviços
    await initializePinecone();
});
// Para Vercel - export default
exports.default = app;
