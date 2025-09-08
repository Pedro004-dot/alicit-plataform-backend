"use strict";
/**
 * Teste da otimização de chunking
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
async function testOptimizedChunking() {
    console.log('🔍 TESTE DE CHUNKING OTIMIZADO');
    console.log('═'.repeat(50));
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
            licitacaoId: 'TEST-OPTIMIZED',
            documentIndex: 0,
            text: data.text,
            metadata: { documentType: 'edital' }
        };
        // Testar chunking via repository (com filtros aplicados)
        console.log('\n🔧 TESTANDO CHUNKING OTIMIZADO...');
        const chunks = await repository.chunkDocument(mockDoc);
        console.log(`\n✅ RESULTADO OTIMIZADO:`);
        console.log(`📊 Chunks finais: ${chunks.length}`);
        console.log(`💰 Custo estimado: $${(chunks.length * 0.0001).toFixed(4)}`);
        console.log(`⏱️ Tempo embedding: ~${Math.ceil(chunks.length / 5) * 0.1}s`);
        if (chunks.length > 0) {
            console.log(`🎯 Primeiro chunk: "${chunks[0]?.text?.substring(0, 100)}..."`);
            console.log(`📊 Relevância: ${chunks[0]?.metadata?.criticality || 'N/A'}`);
        }
        // Análise de distribuição
        const distribution = {
            'Alta (≥0.8)': chunks.filter((c) => (c.metadata.criticality || 0) >= 0.8).length,
            'Média (0.6-0.8)': chunks.filter((c) => {
                const crit = c.metadata.criticality || 0;
                return crit >= 0.6 && crit < 0.8;
            }).length,
            'Baixa (<0.6)': chunks.filter((c) => (c.metadata.criticality || 0) < 0.6).length
        };
        console.log('\n📊 DISTRIBUIÇÃO DE RELEVÂNCIA:');
        Object.entries(distribution).forEach(([level, count]) => {
            console.log(`  ${level}: ${count} chunks`);
        });
        const reduction = ((15219 - chunks.length) / 15219 * 100).toFixed(1);
        console.log(`\n🎯 OTIMIZAÇÃO: ${reduction}% de redução (${15219} → ${chunks.length})`);
        await repository.close();
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
}
testOptimizedChunking();
