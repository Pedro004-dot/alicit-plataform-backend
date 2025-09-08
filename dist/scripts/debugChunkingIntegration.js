"use strict";
/**
 * Debug específico: comparar chunking isolado vs integrado
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const editalRAGRepository_1 = require("../repositories/editalRAGRepository");
const chunk_1 = require("../repositories/RAG/chunk");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function debugChunkingIntegration() {
    console.log('🔍 DEBUG: CHUNKING ISOLADO VS INTEGRADO');
    console.log('═'.repeat(50));
    try {
        // Carregar mesmo PDF
        const pdfPath = path.join(__dirname, '../../documents/edital_maripora/Edital Pregao Eletronico n 90005-2025 - Gestao documental.pdf');
        const buffer = fs.readFileSync(pdfPath);
        const data = await (0, pdf_parse_1.default)(buffer);
        console.log(`📄 PDF: ${data.text.length} caracteres\n`);
        // 1. TESTE ISOLADO (como no testChunkingOnly)
        console.log('1️⃣ CHUNKING ISOLADO:');
        console.log('─'.repeat(30));
        const isolatedChunks = chunk_1.StructuralChunker.processDocument(data.text);
        console.log(`✅ Chunks gerados: ${isolatedChunks.length}`);
        console.log(`📊 Relevância média: ${(isolatedChunks.reduce((sum, c) => sum + c.enrichedMetadata.estimatedRelevance, 0) / isolatedChunks.length).toFixed(2)}`);
        console.log(`🎯 Primeiro chunk:`, {
            id: isolatedChunks[0]?.id,
            relevance: isolatedChunks[0]?.enrichedMetadata?.estimatedRelevance,
            isCritical: isolatedChunks[0]?.enrichedMetadata?.isCritical
        });
        // 2. TESTE INTEGRADO (via EditalRAGRepository)
        console.log('\n2️⃣ CHUNKING INTEGRADO:');
        console.log('─'.repeat(30));
        const repository = new editalRAGRepository_1.EditalRAGRepository();
        await repository.initialize();
        const mockDoc = {
            licitacaoId: 'DEBUG-TEST',
            documentIndex: 0,
            text: data.text,
            metadata: { documentType: 'edital' }
        };
        // Chamar método privado usando any
        const integratedChunks = await repository.chunkDocument(mockDoc);
        console.log(`✅ Chunks gerados: ${integratedChunks.length}`);
        if (integratedChunks.length > 0) {
            console.log(`🎯 Primeiro chunk:`, {
                id: integratedChunks[0]?.id,
                hierarchyPath: integratedChunks[0]?.metadata?.hierarchyPath,
                criticality: integratedChunks[0]?.metadata?.criticality
            });
        }
        await repository.close();
        // 3. ANÁLISE COMPARATIVA
        console.log('\n3️⃣ ANÁLISE:');
        console.log('─'.repeat(30));
        if (isolatedChunks.length === 0) {
            console.log('❌ Chunking isolado falhou - problema no StructuralChunker');
        }
        else if (integratedChunks.length === 0) {
            console.log('❌ Chunking integrado falhou - problema na integração');
            console.log('🔍 Possível causa: filtragem muito restritiva');
        }
        else if (integratedChunks.length < isolatedChunks.length) {
            const ratio = (integratedChunks.length / isolatedChunks.length * 100).toFixed(1);
            console.log(`⚠️ Chunks perdidos na integração: ${ratio}% preservados`);
        }
        else {
            console.log('✅ Integração funcionando corretamente');
        }
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
}
debugChunkingIntegration();
