"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const analysisService_1 = require("../services/edital/analysisService");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function testAnalysisFixed() {
    console.log('🧪 Testando sistema de análise corrigido...');
    const analysisService = new analysisService_1.EditalAnalysisService();
    const testRequest = {
        licitacaoId: 'TEST-123',
        empresaId: 'TEST-EMPRESA',
    };
    try {
        console.log('📞 Iniciando análise...');
        const result = await analysisService.analyzeEdital(testRequest);
        console.log('✅ Resultado obtido:');
        console.log('  - Status:', result.status);
        console.log('  - FinalReport length:', result.finalReport?.length || 0);
        console.log('  - FinalReport preview:', result.finalReport?.substring(0, 200) + '...' || 'N/A');
        console.log('  - Technical Summary:', result.technicalSummary ? 'PRESENTE' : 'AUSENTE');
        console.log('  - Impugnacao Analysis:', result.impugnacaoAnalysis ? 'PRESENTE' : 'AUSENTE');
        console.log('  - PDF Path:', result.pdfPath ? 'GERADO' : 'NÃO GERADO');
    }
    catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}
testAnalysisFixed().catch(console.error);
