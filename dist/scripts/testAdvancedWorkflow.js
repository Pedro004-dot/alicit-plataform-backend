"use strict";
/**
 * Teste do workflow avançado com 8 agentes especializados
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mastra_1 = require("../mastra");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function testAdvancedWorkflow() {
    console.log('🚀 TESTE DO WORKFLOW AVANÇADO (8 AGENTES)');
    console.log('═'.repeat(60));
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY não encontrada!');
        return;
    }
    const licitacaoId = 'MARIPORA-90005-2025';
    const empresaId = 'ALICIT-DEMO';
    try {
        console.log(`📋 Iniciando análise avançada...`);
        console.log(`🆔 Licitação: ${licitacaoId}`);
        console.log(`🏢 Empresa: ${empresaId}`);
        const startTime = Date.now();
        // Executar workflow avançado
        const workflow = mastra_1.mastra.getWorkflow('editalAdvancedAnalysisWorkflow');
        const run = await workflow.createRunAsync();
        const result = await run.start({
            inputData: {
                licitacaoId,
                empresaId
            }
        });
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️ Tempo de execução: ${duration}s`);
        console.log(`📊 Status: ${result.status}`);
        if (result.status === 'success') {
            const stepResult = result.steps['analyze-edital-advanced'];
            const report = stepResult.result.finalReport;
            const validationScore = stepResult.result.validationScore;
            console.log(`🏆 Score de Validação: ${validationScore}/100`);
            // Analisar seções do relatório
            console.log('\n📄 ESTRUTURA DO RELATÓRIO GERADO:');
            console.log('─'.repeat(50));
            const sections = [
                'IDENTIFICAÇÃO DO EDITAL',
                'PRAZOS CRÍTICOS',
                'REQUISITOS DE PARTICIPAÇÃO',
                'ANÁLISE DE CONFORMIDADE LEGAL',
                'ANÁLISE DE RISCOS CONTRATUAIS',
                'VIABILIDADE FINANCEIRA',
                'CAPACIDADE TÉCNICA DA EMPRESA',
                'INTELIGÊNCIA COMPETITIVA'
            ];
            sections.forEach((section, index) => {
                const hasSection = report.includes(section);
                const icon = hasSection ? '✅' : '❌';
                console.log(`${icon} ${index + 1}. ${section}`);
            });
            // Estatísticas do relatório
            console.log('\n📊 ESTATÍSTICAS:');
            console.log('─'.repeat(30));
            console.log(`📝 Tamanho total: ${report.length.toLocaleString()} caracteres`);
            console.log(`📑 Linhas: ${report.split('\n').length.toLocaleString()}`);
            console.log(`🔍 Palavras: ${report.split(' ').length.toLocaleString()}`);
            // Amostra do relatório (primeiras 500 chars de cada seção)
            console.log('\n📋 PREVIEW DAS ANÁLISES:');
            console.log('═'.repeat(60));
            const extractSection = (report, sectionTitle) => {
                const regex = new RegExp(`### ${sectionTitle}([\\s\\S]*?)(?=###|═══|$)`, 'i');
                const match = report.match(regex);
                return match ? match[1].trim().substring(0, 200) + '...' : 'Seção não encontrada';
            };
            console.log('\n🏛️ DADOS BÁSICOS:');
            console.log(extractSection(report, 'IDENTIFICAÇÃO DO EDITAL'));
            console.log('\n💰 ANÁLISE FINANCEIRA:');
            console.log(extractSection(report, 'VIABILIDADE FINANCEIRA'));
            console.log('\n⚠️ ANÁLISE DE RISCOS:');
            console.log(extractSection(report, 'ANÁLISE DE RISCOS CONTRATUAIS'));
            console.log('\n🎯 INTELIGÊNCIA COMPETITIVA:');
            console.log(extractSection(report, 'INTELIGÊNCIA COMPETITIVA'));
            // Avaliação final
            console.log('\n🎯 AVALIAÇÃO FINAL:');
            console.log('═'.repeat(40));
            if (validationScore >= 90) {
                console.log('🏆 EXCELENTE! Workflow avançado funcionando perfeitamente');
            }
            else if (validationScore >= 75) {
                console.log('✅ MUITO BOM! Workflow com alta qualidade');
            }
            else if (validationScore >= 60) {
                console.log('👍 BOM! Workflow funcional com espaço para melhorias');
            }
            else {
                console.log('⚠️ Workflow precisa de ajustes');
            }
        }
        else {
            console.error(`❌ Workflow falhou: ${result.status}`);
            if ('error' in result) {
                console.error(`📄 Erro:`, result.error);
            }
        }
    }
    catch (error) {
        console.error('\n❌ ERRO NO TESTE:');
        console.error('═'.repeat(40));
        console.error(`📍 Tipo: ${error.constructor.name}`);
        console.error(`📄 Mensagem: ${error.message}`);
        if (error.stack) {
            console.error(`🔍 Stack: ${error.stack.split('\n')[0]}`);
        }
    }
    console.log('\n🏁 TESTE CONCLUÍDO!');
    console.log('═'.repeat(60));
}
testAdvancedWorkflow();
