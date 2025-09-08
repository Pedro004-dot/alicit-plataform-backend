"use strict";
/**
 * Debug: Comparar texto processado vs texto direto do PDF
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
const processDocuments_1 = require("../services/edital/hooks/processDocuments");
const chunk_1 = require("../repositories/RAG/chunk");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function debugTextProcessing() {
    console.log('🔍 DEBUG: COMPARAÇÃO DE PROCESSAMENTO DE TEXTO');
    console.log('═'.repeat(60));
    try {
        // 1. Carregar PDF diretamente (como no teste isolado)
        const pdfPath = path.join(__dirname, '../../documents/edital_maripora/Edital Pregao Eletronico n 90005-2025 - Gestao documental.pdf');
        const buffer = fs.readFileSync(pdfPath);
        const directData = await (0, pdf_parse_1.default)(buffer);
        console.log('📄 TEXTO DIRETO DO PDF:');
        console.log(`📊 Caracteres: ${directData.text.length}`);
        console.log(`🔤 Primeiros 200 chars: "${directData.text.substring(0, 200).replace(/\n/g, '\\n')}"`);
        // 2. Testar chunking direto
        const directChunks = chunk_1.StructuralChunker.processDocument(directData.text);
        console.log(`✅ Chunks diretos: ${directChunks.length}`);
        console.log('\n' + '─'.repeat(60) + '\n');
        // 3. Carregar via processDocuments (como no workflow)
        const mockRequest = {
            licitacaoId: 'DEBUG-TEXT',
            empresaId: 'DEBUG',
            documents: [{
                    buffer,
                    filename: 'test.pdf',
                    path: pdfPath
                }]
        };
        const processedDocs = await (0, processDocuments_1.processDocuments)(mockRequest);
        const processedText = processedDocs[0]?.text || '';
        console.log('📄 TEXTO VIA WORKFLOW:');
        console.log(`📊 Caracteres: ${processedText.length}`);
        console.log(`🔤 Primeiros 200 chars: "${processedText.substring(0, 200).replace(/\n/g, '\\n')}"`);
        // 4. Testar chunking processado
        const processedChunks = chunk_1.StructuralChunker.processDocument(processedText);
        console.log(`✅ Chunks processados: ${processedChunks.length}`);
        console.log('\n' + '═'.repeat(60) + '\n');
        // 5. COMPARAÇÃO CRÍTICA
        console.log('🔍 ANÁLISE COMPARATIVA:');
        console.log(`📏 Diferença de tamanho: ${Math.abs(directData.text.length - processedText.length)} caracteres`);
        console.log(`📊 Diferença de chunks: ${Math.abs(directChunks.length - processedChunks.length)} chunks`);
        const textEquals = directData.text === processedText;
        console.log(`🔍 Textos idênticos: ${textEquals ? '✅ SIM' : '❌ NÃO'}`);
        if (!textEquals) {
            console.log('\n🚨 PROBLEMA ENCONTRADO:');
            console.log('- Textos são diferentes entre processamento direto e via workflow');
            console.log('- Isso explica por que o chunking estrutural não detecta a hierarquia');
            // Comparar primeiras linhas para identificar diferença
            const directLines = directData.text.split('\n').slice(0, 10);
            const processedLines = processedText.split('\n').slice(0, 10);
            console.log('\n📝 PRIMEIRAS 10 LINHAS - DIRETO:');
            directLines.forEach((line, i) => console.log(`${i + 1}: "${line}"`));
            console.log('\n📝 PRIMEIRAS 10 LINHAS - PROCESSADO:');
            processedLines.forEach((line, i) => console.log(`${i + 1}: "${line}"`));
        }
        else {
            console.log('\n✅ Textos são idênticos - problema pode ser em outro lugar');
        }
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
}
debugTextProcessing();
