"use strict";
/**
 * Teste dos novos agentes especializados
 */
Object.defineProperty(exports, "__esModule", { value: true });
const agents_1 = require("../mastra/agents");
const RAGService_1 = require("../services/edital/RAGService");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function testAdvancedAgents() {
    console.log('🚀 TESTE DOS NOVOS AGENTES ESPECIALIZADOS');
    console.log('═'.repeat(60));
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY não encontrada!');
        return;
    }
    const licitacaoId = 'MARIPORA-90005-2025';
    const empresaId = 'TESTE-001';
    try {
        // Inicializar RAG
        const ragService = new RAGService_1.EditalRAGService();
        await ragService.initialize();
        // Contextos específicos para cada agente
        const contextos = {
            riscos: await ragService.queryEdital(licitacaoId, 'multa penalidade garantia caução rescisão responsabilidade SLA', 8),
            financeiro: await ragService.queryEdital(licitacaoId, 'valor estimado pagamento reajuste orçamento custo receita', 8),
            tecnico: await ragService.queryEdital(licitacaoId, 'especificação técnica equipe profissional certificação infraestrutura', 8),
            mercado: await ragService.queryEdital(licitacaoId, 'fornecedor concorrente histórico contrato similar porte', 8)
        };
        console.log('📊 Contextos coletados:');
        Object.entries(contextos).forEach(([agente, chunks]) => {
            const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            console.log(`  ${agente}: ${chunks.length} chunks, ${totalChars} caracteres`);
        });
        // Testar cada agente individualmente
        console.log('\n🤖 TESTANDO AGENTES:\n');
        // 1. AGENTE DE RISCOS
        console.log('1️⃣ AGENTE DE RISCOS');
        console.log('─'.repeat(40));
        try {
            const contextRiscos = contextos.riscos.join('\n\n');
            const resultRiscos = await agents_1.riscosAgent.generateVNext(`Analise riscos contratuais para empresa ${empresaId}:\n${contextRiscos}`);
            console.log('✅ Análise de Riscos:');
            console.log(resultRiscos.text.substring(0, 300) + '...\n');
        }
        catch (error) {
            console.error('❌ Erro no Agente de Riscos:', error);
        }
        // 2. AGENTE FINANCEIRO
        console.log('2️⃣ AGENTE FINANCEIRO');
        console.log('─'.repeat(40));
        try {
            const contextFinanceiro = contextos.financeiro.join('\n\n');
            const resultFinanceiro = await agents_1.financeiroAgent.generateVNext(`Avalie viabilidade financeira para ${empresaId}:\n${contextFinanceiro}`);
            console.log('✅ Análise Financeira:');
            console.log(resultFinanceiro.text.substring(0, 300) + '...\n');
        }
        catch (error) {
            console.error('❌ Erro no Agente Financeiro:', error);
        }
        // 3. AGENTE TÉCNICO  
        console.log('3️⃣ AGENTE TÉCNICO');
        console.log('─'.repeat(40));
        try {
            const contextTecnico = contextos.tecnico.join('\n\n');
            const resultTecnico = await agents_1.tecnicoAgent.generateVNext(`Valide capacidade técnica de ${empresaId}:\n${contextTecnico}`);
            console.log('✅ Análise Técnica:');
            console.log(resultTecnico.text.substring(0, 300) + '...\n');
        }
        catch (error) {
            console.error('❌ Erro no Agente Técnico:', error);
        }
        // 4. AGENTE DE MERCADO
        console.log('4️⃣ AGENTE DE MERCADO');
        console.log('─'.repeat(40));
        try {
            const contextMercado = contextos.mercado.join('\n\n');
            const resultMercado = await agents_1.mercadoAgent.generateVNext(`Analise mercado competitivo:\n${contextMercado}`);
            console.log('✅ Análise de Mercado:');
            console.log(resultMercado.text.substring(0, 300) + '...\n');
        }
        catch (error) {
            console.error('❌ Erro no Agente de Mercado:', error);
        }
        console.log('🎉 TESTE DOS AGENTES CONCLUÍDO!');
        console.log('═'.repeat(60));
    }
    catch (error) {
        console.error('❌ Erro geral:', error);
    }
}
testAdvancedAgents();
