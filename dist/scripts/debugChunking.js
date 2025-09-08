"use strict";
/**
 * Script para debugar o chunking estrutural com edital real
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
const chunk_1 = require("../repositories/RAG/chunk");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
async function debugChunking() {
    console.log("🔍 DEBUG DO CHUNKING ESTRUTURAL");
    console.log("═".repeat(50));
    try {
        // Carregar o PDF real
        const pdfPath = path.join(__dirname, '../../documents/edital_maripora/Edital Pregao Eletronico n 90005-2025 - Gestao documental.pdf');
        if (!fs.existsSync(pdfPath)) {
            console.error("❌ PDF não encontrado:", pdfPath);
            return;
        }
        console.log("📄 Carregando PDF:", pdfPath);
        const buffer = fs.readFileSync(pdfPath);
        const data = await (0, pdf_parse_1.default)(buffer);
        const text = data.text;
        console.log("📊 Texto extraído:");
        console.log(`  - Total caracteres: ${text.length}`);
        console.log(`  - Primeiros 500 chars:`, text.substring(0, 500).replace(/\n/g, ' '));
        // Testar os padrões regex
        console.log("\n🔍 TESTANDO PADRÕES REGEX:");
        console.log("─".repeat(40));
        const patterns = [
            { name: 'Títulos Principais', regex: /^\s*(\d+)\.\s*([A-ZÁÊÔÇÃÕ][A-ZÁÊÔÇÃÕ\s]+[A-ZÁÊÔÇÃÕ])\s*$/gm },
            { name: 'Itens Numerados', regex: /^\s*(\d+\.\d+)\.\s*(.+)$/gm },
            { name: 'Sub-itens', regex: /^\s*(\d+\.\d+\.\d+)\.\s*(.+)$/gm }
        ];
        for (const pattern of patterns) {
            console.log(`\n${pattern.name}:`);
            const matches = Array.from(text.matchAll(pattern.regex));
            console.log(`  Encontrados: ${matches.length} matches`);
            if (matches.length > 0) {
                matches.slice(0, 3).forEach((match, i) => {
                    console.log(`  ${i + 1}. "${match[1]}" -> "${match[2]?.substring(0, 50)}..."`);
                });
            }
        }
        // Testar o StructuralChunker
        console.log("\n🧠 TESTANDO STRUCTURAL CHUNKER:");
        console.log("─".repeat(40));
        const enrichedChunks = chunk_1.StructuralChunker.processDocument(text);
        console.log(`📊 Chunks enriquecidos gerados: ${enrichedChunks.length}`);
        if (enrichedChunks.length > 0) {
            console.log("\n📋 Primeiros 5 chunks:");
            enrichedChunks.slice(0, 5).forEach((chunk, i) => {
                console.log(`\n${i + 1}. ID: ${chunk.id}`);
                console.log(`   Tipo: ${chunk.metadata.contentType}`);
                console.log(`   Texto: "${chunk.text.substring(0, 100)}..."`);
                console.log(`   Criticidade: ${chunk.enrichedMetadata.criticality.toFixed(2)}`);
                console.log(`   Relevância: ${chunk.enrichedMetadata.estimatedRelevance.toFixed(2)}`);
            });
        }
        else {
            console.log("❌ Nenhum chunk gerado - tentando fallback...");
            // Testar detecção manual
            console.log("\n🔍 ANÁLISE MANUAL DO TEXTO:");
            const lines = text.split('\n').slice(0, 50);
            lines.forEach((line, i) => {
                const trimmed = line.trim();
                if (trimmed.match(/^\d+\./)) {
                    console.log(`Linha ${i}: "${trimmed.substring(0, 80)}..."`);
                }
            });
        }
    }
    catch (error) {
        console.error("❌ Erro no debug:", error);
    }
}
// Executar debug
debugChunking();
