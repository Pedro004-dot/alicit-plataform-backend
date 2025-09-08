"use strict";
/**
 * Teste do sistema de chunking com consolidação de 512+ caracteres
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function testConsolidatedChunking() {
    console.log('🔧 TESTE DE CHUNKING CONSOLIDADO (512+ chars)');
    console.log('═'.repeat(60));
    try {
        // Carregar PDF
        const pdfPath = path.join(__dirname, '../../documents/edital_maripora/Edital Pregao Eletronico n 90005-2025 - Gestao documental.pdf');
        const buffer = fs.readFileSync(pdfPath);
        const data = await (0, pdf_parse_1.default)(buffer);
        console.log(`📄 PDF: ${data.text.length} caracteres`);
        // Criar repository
        const repository = new editalRAGRepository_1.EditalRAGRepository();
        await repository.initialize();
        // Simular documento
        const mockDoc = {
            licitacaoId: 'TEST-CONSOLIDATED',
            documentIndex: 0,
            text: data.text,
            metadata: { documentType: 'edital' }
        };
        // Testar chunking consolidado
        console.log('\n🔧 TESTANDO CHUNKING CONSOLIDADO...');
        const startTime = Date.now();
        const chunks = await repository.chunkDocument(mockDoc);
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        // Análise de tamanhos
        const chunkSizes = chunks.map((c) => c.text.length);
        const avgSize = Math.round(chunkSizes.reduce((sum, size) => sum + size, 0) / chunks.length);
        const minSize = Math.min(...chunkSizes);
        const maxSize = Math.max(...chunkSizes);
        const chunksAbove512 = chunkSizes.filter((size) => size >= 512).length;
        console.log(`\n✅ RESULTADO CONSOLIDADO:`);
        console.log(`📊 Chunks finais: ${chunks.length}`);
        console.log(`📏 Tamanho médio: ${avgSize} caracteres`);
        console.log(`📏 Tamanho mín/máx: ${minSize}/${maxSize} caracteres`);
        console.log(`🎯 Chunks ≥512 chars: ${chunksAbove512}/${chunks.length} (${((chunksAbove512 / chunks.length) * 100).toFixed(1)}%)`);
        console.log(`💰 Custo estimado: $${(chunks.length * 0.0001).toFixed(4)}`);
        console.log(`⏱️ Tempo processamento: ${processingTime}s`);
        console.log(`⏱️ Tempo embedding: ~${Math.ceil(chunks.length / 5) * 0.1}s`);
        // Análise de consolidação
        const consolidatedChunks = chunks.filter((c) => c.metadata?.originalChunksCount > 1);
        console.log(`\n🔗 ANÁLISE DE CONSOLIDAÇÃO:`);
        console.log(`📦 Chunks consolidados: ${consolidatedChunks.length}/${chunks.length}`);
        if (consolidatedChunks.length > 0) {
            const avgOriginal = Math.round(consolidatedChunks.reduce((sum, c) => sum + (c.metadata.originalChunksCount || 1), 0) / consolidatedChunks.length);
            console.log(`📊 Média de chunks originais por consolidado: ${avgOriginal}`);
        }
        // Amostra de chunks
        if (chunks.length > 0) {
            console.log(`\n📋 AMOSTRA DE CHUNKS:`);
            chunks.slice(0, 3).forEach((chunk, index) => {
                const isConsolidated = chunk.metadata?.originalChunksCount > 1 ? ' (CONSOLIDADO)' : '';
                console.log(`\n${index + 1}. [${chunk.text.length} chars]${isConsolidated}`);
                console.log(`   Texto: "${chunk.text.substring(0, 120)}..."`);
                console.log(`   Relevância: ${chunk.metadata?.criticality?.toFixed(3) || 'N/A'}`);
            });
        }
        // Comparação com sistema anterior
        const reduction = ((15219 - chunks.length) / 15219 * 100).toFixed(1);
        console.log(`\n🎯 COMPARAÇÃO:`);
        console.log(`   Chunks não-otimizados: 15,219`);
        console.log(`   Chunks filtrados: ~2,000`);
        console.log(`   Chunks consolidados: ${chunks.length}`);
        console.log(`   Redução total: ${reduction}% (15,219 → ${chunks.length})`);
        await repository.close();
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
}
testConsolidatedChunking();
