"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const editalAnalysisAgent_1 = require("../mastra/agents/editalAnalysisAgent");
const impugnacaoAgent_1 = require("../mastra/agents/impugnacaoAgent");
// Carregar .env
(0, dotenv_1.config)();
console.log('🧪 TESTE DIRETO DOS AGENTES SEM WORKFLOW');
console.log('════════════════════════════════════════════════════════════════════════════════');
async function testDirectAgents() {
    try {
        console.log(`✅ OPENAI_API_KEY carregada: ${process.env.OPENAI_API_KEY?.substring(0, 20)}...`);
        // Contexto de teste reduzido
        const testContext = `
EDITAL DE PREGÃO ELETRÔNICO Nº 90005/2025
CÂMARA MUNICIPAL DE MAIRIPORÃ-SP

OBJETO: Contratação de empresa para prestação de serviços de gestão documental.

PRAZO DE ENTREGA: 30 dias corridos
VALOR ESTIMADO: R$ 50.000,00

HABILITAÇÃO TÉCNICA:
- Atestado de capacidade técnica em serviços similares
- Registro na Junta Comercial

CRITÉRIO DE JULGAMENTO: Menor preço global
MODALIDADE: Pregão Eletrônico
DATA DE ABERTURA: 15/02/2025 às 14h00
`;
        console.log(`📄 Contexto de teste: ${testContext.length} caracteres\n`);
        // TESTE 1: Agente de Análise Técnica
        console.log('🔍 TESTANDO AGENTE DE ANÁLISE TÉCNICA...');
        try {
            const technicalResult = await editalAnalysisAgent_1.editalAnalysisAgent.generateVNext(`Analise o seguinte edital e gere um resumo técnico estruturado:

${testContext}

Siga rigorosamente a estrutura da sua instrução.`);
            console.log('✅ SUCESSO - Agente de Análise Técnica');
            console.log('📋 Resultado (primeiros 200 chars):');
            console.log(technicalResult.text?.substring(0, 200) + '...\n');
        }
        catch (error) {
            console.log('❌ ERRO - Agente de Análise Técnica:');
            console.log(`📍 Tipo: ${error.constructor.name}`);
            console.log(`📄 Mensagem: ${error.message}`);
            console.log(`🔍 Stack: ${error.stack?.substring(0, 300)}...\n`);
        }
        // TESTE 2: Agente de Impugnação
        console.log('⚖️ TESTANDO AGENTE DE IMPUGNAÇÃO...');
        try {
            const impugnacaoResult = await impugnacaoAgent_1.impugnacaoAgent.generateVNext(`Analise o seguinte edital em busca de possíveis irregularidades para impugnação:

${testContext}

Identifique vícios e irregularidades seguindo sua instrução.`);
            console.log('✅ SUCESSO - Agente de Impugnação');
            console.log('📋 Resultado (primeiros 200 chars):');
            console.log(impugnacaoResult.text?.substring(0, 200) + '...\n');
        }
        catch (error) {
            console.log('❌ ERRO - Agente de Impugnação:');
            console.log(`📍 Tipo: ${error.constructor.name}`);
            console.log(`📄 Mensagem: ${error.message}`);
            console.log(`🔍 Stack: ${error.stack?.substring(0, 300)}...\n`);
        }
    }
    catch (error) {
        console.log('❌ ERRO GERAL:');
        console.log(`📍 Tipo: ${error.constructor.name}`);
        console.log(`📄 Mensagem: ${error.message}`);
        console.log(`🔍 Stack: ${error.stack}`);
    }
}
async function main() {
    console.log('🚀 Iniciando teste direto dos agentes...\n');
    const startTime = Date.now();
    await testDirectAgents();
    const endTime = Date.now();
    console.log('🎉 TESTE CONCLUÍDO!');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log(`⏱️ Tempo total: ${((endTime - startTime) / 1000).toFixed(2)}s`);
}
main().catch(console.error);
