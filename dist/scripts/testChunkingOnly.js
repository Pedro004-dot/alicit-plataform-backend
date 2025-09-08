"use strict";
/**
 * Teste rápido só do chunking
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
async function testChunking() {
    console.log('🧪 TESTE RÁPIDO DO CHUNKING');
    console.log('═'.repeat(40));
    try {
        // Carregar PDF
        const pdfPath = path.join(__dirname, '../../documents/edital_maripora/Edital Pregao Eletronico n 90005-2025 - Gestao documental.pdf');
        const buffer = fs.readFileSync(pdfPath);
        const data = await (0, pdf_parse_1.default)(buffer);
        console.log(`📄 PDF carregado: ${data.text.length} caracteres`);
        // Criar repository
        const repository = new editalRAGRepository_1.EditalRAGRepository();
        await repository.initialize();
        // Simular documento
        const mockDoc = {
            licitacaoId: 'TEST-CHUNK',
            documentIndex: 0,
            text: data.text,
            metadata: { documentType: 'edital' }
        };
        // Testar chunking diretamente
        console.log('\n🔍 TESTANDO CHUNKING...');
        const chunks = await repository.chunkDocument(mockDoc);
        console.log(`\n✅ RESULTADO:`);
        console.log(`📊 Total de chunks gerados: ${chunks.length}`);
        console.log(`🎯 Primeiro chunk ID: ${chunks[0]?.id}`);
        console.log(`📝 Primeiro chunk preview: "${chunks[0]?.text?.substring(0, 100)}..."`);
        console.log(`🔧 Metadados do primeiro chunk:`, {
            hierarchyPath: chunks[0]?.metadata?.hierarchyPath,
            depth: chunks[0]?.metadata?.depth,
            criticality: chunks[0]?.metadata?.criticality,
            sectionType: chunks[0]?.metadata?.sectionType
        });
        // Estatísticas
        const withHierarchy = chunks.filter((c) => c.metadata.hierarchyPath && c.metadata.hierarchyPath !== 'geral').length;
        const critical = chunks.filter((c) => c.metadata.criticality > 0.5).length;
        console.log(`\n📊 ESTATÍSTICAS:`);
        console.log(`🌳 Chunks com hierarquia: ${withHierarchy}/${chunks.length} (${(withHierarchy / chunks.length * 100).toFixed(1)}%)`);
        console.log(`🚨 Chunks críticos: ${critical}/${chunks.length} (${(critical / chunks.length * 100).toFixed(1)}%)`);
        if (chunks.length > 330) {
            console.log(`\n🎉 SUCESSO! Chunking enriquecido funcionando (${chunks.length} vs 330 tradicional)`);
        }
        else {
            console.log(`\n⚠️ Usando fallback tradicional (${chunks.length} chunks)`);
        }
        await repository.close();
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
}
testChunking();
