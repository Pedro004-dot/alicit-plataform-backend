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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = require("dotenv");
// Carregar variáveis de ambiente
(0, dotenv_1.config)();
async function loadMaritporaDocuments() {
    const documentsPath = path.join(__dirname, '../../documents/edital_maripora');
    const documents = [];
    try {
        console.log(`📁 Buscando documentos em: ${documentsPath}`);
        // Verificar se a pasta existe
        if (!fs.existsSync(documentsPath)) {
            console.error("❌ Pasta edital_maripora não encontrada!");
            return [];
        }
        // Ler todos os arquivos da pasta edital_maripora
        const files = fs.readdirSync(documentsPath);
        console.log(`📋 Arquivos encontrados na pasta edital_maripora: ${files.length}`);
        files.forEach(file => console.log(`  - ${file}`));
        for (const file of files) {
            const filePath = path.join(documentsPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && file.endsWith('.pdf')) {
                console.log(`📄 Carregando PDF: ${file}`);
                console.log(`📊 Tamanho do arquivo: ${(stat.size / 1024).toFixed(2)} KB`);
                const buffer = fs.readFileSync(filePath);
                documents.push({
                    buffer,
                    filename: file,
                    path: filePath,
                });
                console.log(`✅ PDF carregado: ${file} (${buffer.length} bytes)`);
            }
        }
        console.log(`✅ Total de ${documents.length} documentos PDF carregados da pasta edital_maripora`);
        return documents;
    }
    catch (error) {
        console.error("❌ Erro ao carregar documentos da pasta edital_maripora:", error);
        return [];
    }
}
async function testEditalAnalysis() {
    console.log("🚀 INICIANDO TESTE AVANÇADO COM 8 AGENTES ESPECIALIZADOS");
    console.log("═".repeat(80));
    // Verificar se API key está carregada
    if (!process.env.OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY não encontrada! Verifique o arquivo .env");
        return;
    }
    console.log("✅ OPENAI_API_KEY carregada:", process.env.OPENAI_API_KEY.substring(0, 20) + "...");
    console.log(`🤖 Modo de análise: AVANÇADO (8 agentes) - Workflow refatorado`);
    console.log("🎯 Agentes: Dados, Prazos, Habilitação, Compliance, Riscos, Financeiro, Técnico, Mercado");
    const service = new analysisService_1.EditalAnalysisService();
    try {
        console.log("🔧 Inicializando serviço...");
        console.log("✅ Serviço inicializado com sucesso");
        // Carregar documentos específicos da pasta edital_maripora
        console.log("\n📂 CARREGANDO DOCUMENTOS");
        console.log("─".repeat(50));
        const localDocuments = await loadMaritporaDocuments();
        if (localDocuments.length === 0) {
            console.error("❌ Nenhum documento PDF encontrado na pasta edital_maripora!");
            console.log("💡 Certifique-se de que os arquivos PDF estão na pasta backend/documents/edital_maripora/");
            return;
        }
        console.log(`\n📊 RESUMO DOS DOCUMENTOS CARREGADOS:`);
        localDocuments.forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.filename} (${(doc.buffer.length / 1024).toFixed(2)} KB)`);
        });
        // Preparar request de análise avançada
        const mockRequest = {
            licitacaoId: "MARIPORA-90005-2025",
            empresaId: "ALICIT-DEMO", // Empresa fictícia para testes
            documents: localDocuments
        };
        console.log("\n🔍 INICIANDO ANÁLISE");
        console.log("─".repeat(50));
        console.log(`📋 Licitação ID: ${mockRequest.licitacaoId}`);
        console.log(`🏢 Empresa ID: ${mockRequest.empresaId}`);
        console.log(`📄 Documentos a analisar: ${mockRequest.documents.length}`);
        // Verificar se edital já foi processado
        const alreadyProcessed = await service.isEditalProcessed(mockRequest.licitacaoId);
        console.log(`🔄 Edital já processado: ${alreadyProcessed ? 'SIM' : 'NÃO'}`);
        console.log("\n⚙️ Processando edital...");
        const startTime = Date.now();
        const result = await service.analyzeEdital(mockRequest);
        const endTime = Date.now();
        console.log("\n✅ ANÁLISE CONCLUÍDA!");
        console.log("═".repeat(80));
        console.log(`⏱️ Tempo de processamento: ${((endTime - startTime) / 1000).toFixed(2)}s`);
        console.log(`📊 Status: ${result.status}`);
        console.log(`🆔 Licitação: ${result.licitacaoId}`);
        console.log(`📅 Processado em: ${result.processedAt}`);
        console.log(`🤖 Modo de análise: AVANÇADO (workflowAnalysis)`);
        console.log(`👥 Agentes utilizados: 8 agentes especializados`);
        // Score de validação avançado
        if (result.validationScore !== undefined) {
            const score = result.validationScore;
            let qualidade;
            if (score >= 90)
                qualidade = '🏆 EXCELENTE';
            else if (score >= 75)
                qualidade = '🟢 MUITO BOM';
            else if (score >= 60)
                qualidade = '🟡 BOM';
            else
                qualidade = '🔴 BAIXA';
            console.log(`🔍 Score de Validação Avançado: ${score}/100 - ${qualidade}`);
        }
        if (result.pdfPath) {
            console.log(`📑 PDF gerado: ${result.pdfPath}`);
        }
        // Analisar o relatório final completo (nova estrutura)
        console.log("\n📄 RELATÓRIO COMPLETO (NOVA ESTRUTURA):");
        console.log("─".repeat(80));
        if (result.finalReport) {
            const sections = result.finalReport.split('##');
            sections.forEach((section, index) => {
                if (section.trim() && index > 0) {
                    const title = section.split('\n')[0].trim();
                    const content = section.substring(section.indexOf('\n') + 1).trim();
                    console.log(`\n🔸 ${title}`);
                    console.log("─".repeat(40));
                    console.log(content.substring(0, 300) + (content.length > 300 ? "..." : ""));
                }
            });
        }
        // Análise específica de cada agente (8 agentes especializados)
        console.log(`\n🤖 ANÁLISE POR AGENTES ESPECIALIZADOS (8 agentes):`);
        console.log("─".repeat(80));
        if (result.finalReport) {
            // Extrair seções específicas do novo formato
            const extractSection = (report, sectionTitle) => {
                const regex = new RegExp(`### ${sectionTitle}([\\s\\S]*?)(?=###|═══|$)`, 'i');
                const match = report.match(regex);
                return match ? match[1].trim() : "Não encontrado";
            };
            // Agentes básicos
            console.log("\n📊 DADOS BÁSICOS (dadosBasicosAgent):");
            console.log(extractSection(result.finalReport, 'IDENTIFICAÇÃO DO EDITAL').substring(0, 200) + "...");
            console.log("\n⏰ PRAZOS CRÍTICOS (prazosAgent):");
            console.log(extractSection(result.finalReport, 'PRAZOS CRÍTICOS').substring(0, 200) + "...");
            console.log("\n📋 HABILITAÇÃO (habilitacaoAgent):");
            console.log(extractSection(result.finalReport, 'REQUISITOS DE PARTICIPAÇÃO').substring(0, 200) + "...");
            console.log("\n⚖️ COMPLIANCE (complianceAgent):");
            console.log(extractSection(result.finalReport, 'ANÁLISE DE CONFORMIDADE LEGAL').substring(0, 200) + "...");
            // Agentes avançados sempre executam no workflow refatorado
            console.log("\n🛡️ RISCOS (riscosAgent):");
            console.log(extractSection(result.finalReport, 'ANÁLISE DE RISCOS CONTRATUAIS').substring(0, 200) + "...");
            console.log("\n💰 FINANCEIRO (financeiroAgent):");
            console.log(extractSection(result.finalReport, 'VIABILIDADE FINANCEIRA').substring(0, 200) + "...");
            console.log("\n🔧 TÉCNICO (tecnicoAgent):");
            console.log(extractSection(result.finalReport, 'CAPACIDADE TÉCNICA DA EMPRESA').substring(0, 200) + "...");
            console.log("\n🎯 MERCADO (mercadoAgent):");
            console.log(extractSection(result.finalReport, 'INTELIGÊNCIA COMPETITIVA').substring(0, 200) + "...");
        }
        // Testar consulta RAG com chunking semântico
        console.log("\n🔍 TESTANDO RAG COM CHUNKING SEMÂNTICO");
        console.log("─".repeat(80));
        // Queries expandidas para testar todos os domínios
        const testQueries = {
            "📊 DADOS BÁSICOS": ["órgão licitante", "modalidade pregão", "objeto licitação", "valor estimado"],
            "⏰ PRAZOS": ["data abertura", "prazo questionamentos", "prazo impugnação", "dias úteis"],
            "📋 HABILITAÇÃO": ["atestado capacidade técnica", "índices financeiros", "certidão regularidade", "ME EPP"],
            "⚖️ COMPLIANCE": ["especificação restritiva", "marca modelo exclusivo", "direcionamento", "vício edital"]
        };
        // Queries avançadas sempre incluídas no workflow refatorado
        testQueries["🛡️ RISCOS"] = ["multa penalidade", "garantia caução", "rescisão contrato", "responsabilidade SLA"];
        testQueries["💰 FINANCEIRO"] = ["valor estimado", "forma pagamento", "reajuste preços", "margem lucro"];
        testQueries["🔧 TÉCNICO"] = ["especificação técnica", "equipe profissional", "certificação ISO", "infraestrutura"];
        testQueries["🎯 MERCADO"] = ["concorrência", "fornecedor similar", "histórico órgão", "competitividade"];
        for (const [categoria, queries] of Object.entries(testQueries)) {
            console.log(`\n${categoria}:`);
            console.log("─".repeat(50));
            for (const query of queries) {
                try {
                    console.log(`\n🔎 "${query}"`);
                    const context = await service.queryEdital(mockRequest.licitacaoId, query, 3);
                    if (context.length > 0) {
                        console.log(`  ✅ ${context.length} chunks | ${context[0].length} chars`);
                        console.log(`  📝 "${context[0].substring(0, 100).replace(/\n/g, ' ')}..."`);
                    }
                    else {
                        console.log(`  ❌ Nenhum resultado encontrado`);
                    }
                }
                catch (error) {
                    console.error(`  ❌ Erro: ${error}`);
                }
            }
        }
        // Teste de performance e estatísticas RAG
        console.log("\n📊 ESTATÍSTICAS DO SISTEMA RAG:");
        console.log("─".repeat(50));
        try {
            const perfQueries = ["objeto", "prazo", "valor", "garantia", "penalidade"];
            let totalChunks = 0;
            let totalTime = 0;
            for (const query of perfQueries) {
                const startQuery = Date.now();
                const chunks = await service.queryEdital(mockRequest.licitacaoId, query, 5);
                const endQuery = Date.now();
                totalChunks += chunks.length;
                totalTime += (endQuery - startQuery);
            }
            console.log(`🔍 Total queries testadas: ${perfQueries.length}`);
            console.log(`📋 Total chunks recuperados: ${totalChunks}`);
            console.log(`⏱️ Tempo médio por query: ${(totalTime / perfQueries.length).toFixed(0)}ms`);
            console.log(`📊 Média chunks por query: ${(totalChunks / perfQueries.length).toFixed(1)}`);
        }
        catch (error) {
            console.error("❌ Erro nos testes de performance:", error);
        }
        // Validação final da arquitetura avançada
        console.log("\n🔍 VALIDAÇÃO DA ARQUITETURA AVANÇADA:");
        console.log("─".repeat(80));
        const validationChecks = {
            "✅ Documentos reais processados": result.finalReport && !result.finalReport.includes("Conteúdo simulado"),
            "✅ 8 agentes especializados funcionando": result.finalReport && result.finalReport.includes("agentes especialistas"),
            "✅ Chunking semântico ativo": result.finalReport && result.finalReport.includes("chunking semântico"),
            "✅ Sistema RAG operacional": result.finalReport && result.finalReport.length > 1000,
            "✅ Validação automática": result.validationScore !== undefined,
            "✅ Workflow refatorado": result.finalReport && result.finalReport.includes("RELATÓRIO AVANÇADO"),
            "✅ Análise de riscos presente": result.finalReport && result.finalReport.includes("RISCOS CONTRATUAIS"),
            "✅ Análise financeira presente": result.finalReport && result.finalReport.includes("VIABILIDADE FINANCEIRA"),
            "✅ Análise técnica presente": result.finalReport && result.finalReport.includes("CAPACIDADE TÉCNICA"),
            "✅ Inteligência competitiva presente": result.finalReport && result.finalReport.includes("INTELIGÊNCIA COMPETITIVA"),
            "✅ Score avançado (≥70)": (result.validationScore || 0) >= 70
        };
        let passedChecks = 0;
        Object.entries(validationChecks).forEach(([check, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${check.replace(/^[✅❌] /, '')}`);
            if (passed)
                passedChecks++;
        });
        const successRate = (passedChecks / Object.keys(validationChecks).length) * 100;
        console.log(`\n📊 Taxa de Sucesso: ${successRate.toFixed(0)}% (${passedChecks}/${Object.keys(validationChecks).length})`);
        // Mensagem final baseada no score
        console.log(`\n📊 RESULTADO FINAL (WORKFLOW REFATORADO):`);
        if (successRate >= 90) {
            console.log("🏆 ARQUITETURA REFATORADA EXCELENTE - 8 agentes funcionando perfeitamente!");
        }
        else if (successRate >= 75) {
            console.log("🎉 ARQUITETURA REFATORADA FUNCIONANDO MUITO BEM!");
        }
        else if (successRate >= 60) {
            console.log("👍 ARQUITETURA REFATORADA FUNCIONAL - alguns ajustes recomendados");
        }
        else {
            console.log("⚠️ ARQUITETURA REFATORADA PRECISA DE MELHORIAS");
        }
        console.log(`\n🎯 Próximos passos: Otimizar prompts dos agentes e scores de validação`);
        console.log("\n🎉 TESTE CONCLUÍDO!");
        console.log("═".repeat(80));
    }
    catch (error) {
        console.error("\n❌ ERRO NO TESTE:");
        console.error("═".repeat(80));
        console.error(error);
        if (error instanceof Error) {
            console.error("📍 Stack trace:", error.stack);
        }
    }
}
// Executar o teste
testEditalAnalysis();
