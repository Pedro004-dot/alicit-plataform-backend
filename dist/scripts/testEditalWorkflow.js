#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
// Carregar variáveis de ambiente explicitamente
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// Verificar se OPENAI_API_KEY está carregada
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não encontrada no arquivo .env');
    console.error('📝 Verifique se o arquivo .env está na raiz do projeto com:');
    console.error('   OPENAI_API_KEY=sua_chave_aqui');
    console.log('🔍 Tentando carregar de:', path_1.default.resolve(__dirname, '../../.env'));
    process.exit(1);
}
console.log('✅ OPENAI_API_KEY carregada com sucesso');
const mastra_1 = require("../mastra");
const RAGService_1 = require("../services/edital/RAGService");
const pdfGeneratorAdapter_1 = require("../adapters/pdfGeneratorAdapter");
// ========================================
// CONFIGURAÇÃO DO TESTE
// ========================================
const TEST_CONFIG = {
    // Altere este path para testar diferentes editais
    documentPath: '/Users/pedrotorrezani/Documents/Programacao/alicit2.0/backend/documents/edital_maripora/',
    // ID fictício para o teste (pode ser qualquer string)
    licitacaoId: 'TEST_MARIPORA_90005_2025',
    // ID da empresa (opcional)
    empresaId: 'EMPRESA_TESTE_LTDA',
    // Configurações de debug
    verbose: true,
    saveResults: true,
    resultsDir: '/Users/pedrotorrezani/Documents/Programacao/alicit2.0/backend/test-results/',
};
// ========================================
// CLASSE PRINCIPAL DE TESTE
// ========================================
class EditalWorkflowTester {
    constructor() {
        this.config = TEST_CONFIG;
        this.log('🚀 Iniciando Teste do Workflow de Análise de Edital');
        this.log(`📁 Documento: ${this.config.documentPath}`);
        this.log(`🆔 Licitação ID: ${this.config.licitacaoId}`);
        // Inicializar serviços
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        this.ragService = new RAGService_1.EditalRAGService(redisUrl);
        this.pdfGenerator = new pdfGeneratorAdapter_1.PDFGeneratorAdapter();
    }
    log(message, type = 'info') {
        if (!this.config.verbose && type === 'info')
            return;
        const icons = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warn: '⚠️'
        };
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        console.log(`[${timestamp}] ${icons[type]} ${message}`);
    }
    /**
     * Processa os documentos usando o RAGService real
     */
    async processRAGDocuments() {
        this.log('📚 Processando documentos com RAGService real...');
        try {
            // Verificar se o diretório existe
            const files = await promises_1.default.readdir(this.config.documentPath);
            const documentFiles = files.filter(file => file.endsWith('.pdf') || file.endsWith('.txt') || file.endsWith('.docx'));
            if (documentFiles.length === 0) {
                throw new Error('Nenhum documento encontrado no diretório especificado');
            }
            this.log(`📄 Encontrados ${documentFiles.length} documento(s): ${documentFiles.join(', ')}`);
            // Ler os arquivos e converter para o formato esperado
            const documents = [];
            for (const filename of documentFiles) {
                const filePath = path_1.default.join(this.config.documentPath, filename);
                const buffer = await promises_1.default.readFile(filePath);
                documents.push({
                    filename,
                    buffer,
                    mimetype: filename.endsWith('.pdf') ? 'application/pdf' :
                        filename.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                            'text/plain',
                    size: buffer.length
                });
                this.log(`📄 Arquivo carregado: ${filename} (${buffer.length} bytes)`);
            }
            // Inicializar RAG Service
            await this.ragService.initialize();
            // Processar o edital usando o RAGService real com array de documentos
            const ragResult = await this.ragService.processEdital({
                licitacaoId: this.config.licitacaoId,
                empresaId: this.config.empresaId,
                documents: documents
            });
            this.log(`✅ RAG processado - ${ragResult.documentsCount} documentos, ${ragResult.chunksCount} chunks`, 'success');
            return {
                documentsCount: ragResult.documentsCount,
                chunksCount: ragResult.chunksCount
            };
        }
        catch (error) {
            this.log(`Erro no processamento RAG: ${error}`, 'error');
            throw error;
        }
    }
    /**
     * Executa o workflow completo de análise
     */
    async executeWorkflow() {
        this.log('🤖 Executando workflow multi-agente...');
        try {
            const workflow = mastra_1.mastra.getWorkflow('editalAnalysisWorkflow');
            if (!workflow) {
                throw new Error('Workflow editalAnalysisWorkflow não encontrado');
            }
            this.log('📋 Criando execução do workflow...');
            const run = await workflow.createRunAsync();
            const inputData = {
                licitacaoId: this.config.licitacaoId,
                empresaId: this.config.empresaId,
                refinementAttempts: 0
            };
            this.log('⚡ Iniciando execução dos agentes especialistas...');
            const startTime = Date.now();
            const result = await run.start({ inputData });
            const executionTime = Date.now() - startTime;
            this.log(`🎉 Workflow executado em ${executionTime}ms`, 'success');
            return {
                result,
                executionTime,
                inputData
            };
        }
        catch (error) {
            this.log(`Erro na execução do workflow: ${error}`, 'error');
            throw error;
        }
    }
    /**
     * Analisa e exibe os resultados
     */
    async analyzeResults(workflowResult) {
        this.log('📊 Analisando resultados da execução...');
        try {
            if (workflowResult.result.status !== 'success') {
                this.log(`❌ Workflow falhou com status: ${workflowResult.result.status}`, 'error');
                console.log('Detalhes do erro:', JSON.stringify(workflowResult.result, null, 2));
                return;
            }
            const analysis = workflowResult.result.result?.['compile-final-report'] || workflowResult.result.result;
            if (!analysis) {
                this.log('❌ Resultado da análise não encontrado', 'error');
                return;
            }
            // Estatísticas gerais
            this.log('\n📈 ESTATÍSTICAS DA ANÁLISE:', 'success');
            console.log(`• Score de Qualidade: ${analysis.qualityScore}/100`);
            console.log(`• Status: ${analysis.status}`);
            console.log(`• Análise Completa: ${analysis.isComplete ? 'Sim' : 'Não'}`);
            console.log(`• Tempo de Execução: ${workflowResult.executionTime}ms`);
            console.log(`• Tentativas de Refinamento: ${analysis.executionMetadata?.refinementAttempts || 0}`);
            console.log(`• Agentes Executados: ${analysis.executionMetadata?.totalAgentsExecuted || 0}`);
            console.log(`• Contexto Processado: ${analysis.executionMetadata?.contextoProcessado || 0} chars`);
            // Recomendações
            if (analysis.recommendations && analysis.recommendations.length > 0) {
                this.log('\n💡 RECOMENDAÇÕES:', 'success');
                analysis.recommendations.forEach((rec, index) => {
                    console.log(`${index + 1}. ${rec}`);
                });
            }
            // Preview do relatório
            if (analysis.relatorioCompleto) {
                this.log('\n📋 PREVIEW DO RELATÓRIO:', 'success');
                const preview = analysis.relatorioCompleto.substring(0, 500);
                console.log(`${preview}${analysis.relatorioCompleto.length > 500 ? '...\n[RELATÓRIO COMPLETO SALVO NO ARQUIVO]' : ''}`);
            }
            return analysis;
        }
        catch (error) {
            this.log(`Erro na análise dos resultados: ${error}`, 'error');
            throw error;
        }
    }
    /**
     * Gera PDF do relatório usando PDFGeneratorAdapter
     */
    async generatePDFReport(analysis, ragInfo) {
        try {
            if (!analysis?.relatorioCompleto) {
                this.log('⚠️ Relatório não encontrado, pulando geração de PDF', 'warn');
                return null;
            }
            this.log('📄 Gerando PDF do relatório...');
            const pdfData = {
                licitacaoId: this.config.licitacaoId,
                empresa: this.config.empresaId,
                dataAnalise: new Date().toLocaleString('pt-BR'),
                technicalSummary: this.extractSectionFromReport(analysis.relatorioCompleto, '## 📋 ANÁLISE DE OBJETO E ESCOPO', '## ⏰'),
                impugnacaoAnalysis: this.extractSectionFromReport(analysis.relatorioCompleto, '## 🎯 IMPUGNAÇÕES E ESCLARECIMENTOS', '## 📈'),
                finalReport: analysis.relatorioCompleto,
                documentsAnalyzed: ragInfo?.documentsCount || 0,
                totalCharacters: ragInfo?.chunksCount || 0
            };
            const pdfPath = await this.pdfGenerator.generateReport(pdfData);
            this.log(`📄 PDF gerado com sucesso: ${pdfPath}`, 'success');
            return pdfPath;
        }
        catch (error) {
            this.log(`Erro na geração do PDF: ${error}`, 'error');
            return null;
        }
    }
    /**
     * Extrai uma seção específica do relatório markdown
     */
    extractSectionFromReport(report, startMarker, endMarker) {
        const startIndex = report.indexOf(startMarker);
        if (startIndex === -1)
            return 'Seção não encontrada';
        const endIndex = report.indexOf(endMarker, startIndex);
        const sectionEnd = endIndex === -1 ? report.length : endIndex;
        return report.substring(startIndex, sectionEnd).trim();
    }
    /**
     * Salva os resultados em arquivos para análise posterior
     */
    async saveResults(analysis, workflowResult, ragInfo) {
        if (!this.config.saveResults)
            return;
        try {
            this.log('💾 Salvando resultados...');
            // Criar diretório de resultados se não existir
            await promises_1.default.mkdir(this.config.resultsDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseFilename = `test-${this.config.licitacaoId}-${timestamp}`;
            // Salvar relatório completo em Markdown
            if (analysis?.relatorioCompleto) {
                const reportPath = path_1.default.join(this.config.resultsDir, `${baseFilename}-relatorio.md`);
                await promises_1.default.writeFile(reportPath, analysis.relatorioCompleto, 'utf-8');
                this.log(`📄 Relatório completo salvo em: ${reportPath}`, 'success');
            }
            // Gerar PDF do relatório
            const pdfPath = await this.generatePDFReport(analysis, ragInfo);
            if (pdfPath) {
                // Copiar PDF para diretório de resultados com nome consistente
                const pdfDestination = path_1.default.join(this.config.resultsDir, `${baseFilename}-relatorio.pdf`);
                try {
                    await promises_1.default.copyFile(pdfPath, pdfDestination);
                    this.log(`📄 PDF copiado para: ${pdfDestination}`, 'success');
                }
                catch (copyError) {
                    this.log(`⚠️ Erro ao copiar PDF: ${copyError}`, 'warn');
                }
            }
            // Salvar dados brutos em JSON
            const rawDataPath = path_1.default.join(this.config.resultsDir, `${baseFilename}-raw.json`);
            const rawData = {
                config: this.config,
                executionTime: workflowResult.executionTime,
                inputData: workflowResult.inputData,
                result: analysis,
                ragInfo,
                timestamp: new Date().toISOString(),
            };
            await promises_1.default.writeFile(rawDataPath, JSON.stringify(rawData, null, 2), 'utf-8');
            this.log(`📊 Dados brutos salvos em: ${rawDataPath}`, 'success');
            // Salvar sumário em TXT
            const summaryPath = path_1.default.join(this.config.resultsDir, `${baseFilename}-summary.txt`);
            const summary = `
TESTE DE WORKFLOW - ANÁLISE DE EDITAL
=====================================

Configuração:
• Documento: ${this.config.documentPath}
• Licitação ID: ${this.config.licitacaoId}
• Empresa ID: ${this.config.empresaId}
• Timestamp: ${new Date().toLocaleString('pt-BR')}

Processamento RAG:
• Documentos Processados: ${ragInfo?.documentsCount || 0}
• Chunks Gerados: ${ragInfo?.chunksCount || 0}

Resultados:
• Score de Qualidade: ${analysis?.qualityScore || 'N/A'}/100
• Status: ${analysis?.status || 'N/A'}
• Análise Completa: ${analysis?.isComplete ? 'Sim' : 'Não'}
• Tempo de Execução: ${workflowResult.executionTime}ms
• Tentativas de Refinamento: ${analysis?.executionMetadata?.refinementAttempts || 0}

Recomendações:
${analysis?.recommendations?.map((rec, i) => `${i + 1}. ${rec}`).join('\n') || 'Nenhuma recomendação'}
`;
            await promises_1.default.writeFile(summaryPath, summary, 'utf-8');
            this.log(`📋 Sumário salvo em: ${summaryPath}`, 'success');
        }
        catch (error) {
            this.log(`Erro ao salvar resultados: ${error}`, 'warn');
        }
    }
    /**
     * Executa o teste completo
     */
    async runCompleteTest() {
        const overallStartTime = Date.now();
        try {
            this.log('🎬 Iniciando teste completo do workflow...');
            // 1. Processar documentos com RAG real
            const ragInfo = await this.processRAGDocuments();
            // 2. Executar workflow
            const workflowResult = await this.executeWorkflow();
            // 3. Analisar resultados
            const analysis = await this.analyzeResults(workflowResult);
            // 4. Salvar resultados
            if (analysis) {
                await this.saveResults(analysis, workflowResult, ragInfo);
            }
            const totalTime = Date.now() - overallStartTime;
            this.log(`🏁 TESTE CONCLUÍDO EM ${totalTime}ms`, 'success');
            return {
                success: true,
                totalTime,
                analysis
            };
        }
        catch (error) {
            const totalTime = Date.now() - overallStartTime;
            this.log(`💥 TESTE FALHOU APÓS ${totalTime}ms: ${error}`, 'error');
            return {
                success: false,
                totalTime,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
// ========================================
// EXECUÇÃO PRINCIPAL
// ========================================
async function main() {
    const tester = new EditalWorkflowTester();
    const result = await tester.runCompleteTest();
    console.log('\n' + '='.repeat(60));
    console.log(result.success ? '✅ TESTE CONCLUÍDO COM SUCESSO' : '❌ TESTE FALHOU');
    console.log('='.repeat(60));
    process.exit(result.success ? 0 : 1);
}
// Executar apenas se chamado diretamente
if (require.main === module) {
    main().catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
}
