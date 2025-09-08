#!/usr/bin/env ts-node
"use strict";
/**
 * Script para testar a rota /analysis integração completa
 * Simula uma chamada para o endpoint de análise de edital
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Configurar ambiente
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const analysisController_1 = require("../controller/edital/analysisController");
// Mock do Request/Response do Express para testar o controller diretamente
const mockRequest = {
    body: {
        licitacaoId: 'TEST_MARIPORA_90005_2025', // Usando o mesmo ID que funcionou no script anterior
        empresaId: 'EMPRESA_TESTE_LTDA'
    }
};
const mockResponse = {
    status: (code) => ({
        json: (data) => {
            console.log(`\n📊 RESPONSE STATUS: ${code}`);
            console.log('📋 RESPONSE DATA:');
            console.log(JSON.stringify(data, null, 2));
            return mockResponse;
        }
    }),
    json: (data) => {
        console.log('\n✅ SUCCESS RESPONSE:');
        console.log(JSON.stringify(data, null, 2));
        return mockResponse;
    }
};
async function testAnalysisRoute() {
    console.log('🚀 Testando rota /analysis...');
    console.log(`📋 Testando com: ${mockRequest.body.licitacaoId} - ${mockRequest.body.empresaId}`);
    const controller = new analysisController_1.EditalAnalysisController();
    try {
        await controller.analyzeEdital(mockRequest, mockResponse);
        console.log('\n🎉 Teste concluído com sucesso!');
    }
    catch (error) {
        console.error('\n❌ Erro no teste:', error);
    }
}
// Executar apenas se chamado diretamente
if (require.main === module) {
    testAnalysisRoute().catch((error) => {
        console.error('❌ Erro fatal no teste:', error);
        process.exit(1);
    });
}
