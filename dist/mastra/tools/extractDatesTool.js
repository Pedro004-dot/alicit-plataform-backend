"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDatesFromText = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
exports.extractDatesFromText = (0, tools_1.createTool)({
    id: "extractDatesFromText",
    description: "Extrai todas as datas mencionadas no texto com contexto e classificação de importância",
    inputSchema: zod_1.z.object({
        text: zod_1.z.string().describe("Texto para extrair datas"),
        licitacaoId: zod_1.z.string().optional().describe("ID da licitação para contexto"),
    }),
    outputSchema: zod_1.z.object({
        dates: zod_1.z.array(zod_1.z.object({
            date: zod_1.z.string().describe("Data encontrada (formato YYYY-MM-DD)"),
            originalText: zod_1.z.string().describe("Texto original onde a data foi encontrada"),
            context: zod_1.z.string().describe("Contexto da data (abertura, entrega, etc.)"),
            importance: zod_1.z.enum(["critical", "high", "medium", "low"]).describe("Nível de importância"),
            daysFromNow: zod_1.z.number().describe("Dias a partir de hoje (negativo se já passou)"),
        })),
        totalDatesFound: zod_1.z.number().describe("Total de datas encontradas"),
    }),
    execute: async ({ context }) => {
        try {
            console.log(`📅 Tool: extractDatesFromText - Extraindo datas de texto com ${context.text.length} caracteres`);
            const today = new Date();
            const dates = [];
            // Padrões de data brasileiros
            const datePatterns = [
                // DD/MM/AAAA
                /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
                // DD/MM/AA
                /(\d{1,2})\/(\d{1,2})\/(\d{2})/g,
                // DD-MM-AAAA
                /(\d{1,2})-(\d{1,2})-(\d{4})/g,
                // DD de mês de AAAA
                /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi,
                // DD/mês/AAAA
                /(\d{1,2})\/(\w+)\/(\d{4})/gi,
            ];
            // Mapeamento de meses em português
            const monthNames = {
                'janeiro': 0, 'jan': 0,
                'fevereiro': 1, 'fev': 1,
                'março': 2, 'mar': 2,
                'abril': 3, 'abr': 3,
                'maio': 4, 'mai': 4,
                'junho': 5, 'jun': 5,
                'julho': 6, 'jul': 6,
                'agosto': 7, 'ago': 7,
                'setembro': 8, 'set': 8,
                'outubro': 9, 'out': 9,
                'novembro': 10, 'nov': 10,
                'dezembro': 11, 'dez': 11,
            };
            // Contextos críticos para classificação de importância
            const criticalContexts = [
                'abertura', 'entrega', 'proposta', 'habilitação', 'recurso', 'impugnação',
                'sessão', 'prazo', 'vencimento', 'limite', 'até', 'encerramento'
            ];
            const highContexts = [
                'visita', 'esclarecimento', 'publicação', 'resultado', 'adjudicação',
                'homologação', 'assinatura', 'início', 'vigência'
            ];
            const mediumContexts = [
                'reunião', 'apresentação', 'demonstração', 'análise', 'avaliação'
            ];
            // Processar cada padrão de data
            for (const pattern of datePatterns) {
                let match;
                while ((match = pattern.exec(context.text)) !== null) {
                    const fullMatch = match[0];
                    const matchIndex = match.index;
                    // Extrair contexto (50 chars antes e depois)
                    const contextStart = Math.max(0, matchIndex - 50);
                    const contextEnd = Math.min(context.text.length, matchIndex + fullMatch.length + 50);
                    const dateContext = context.text.substring(contextStart, contextEnd).trim();
                    let parsedDate = null;
                    // Parsing baseado no padrão
                    if (pattern.source.includes('de\\s+\\w+\\s+de')) {
                        // Padrão "DD de mês de AAAA"
                        const day = parseInt(match[1]);
                        const monthName = match[2].toLowerCase();
                        const year = parseInt(match[3]);
                        const month = monthNames[monthName];
                        if (month !== undefined) {
                            parsedDate = new Date(year, month, day);
                        }
                    }
                    else if (pattern.source.includes('\\/\\w+\\/')) {
                        // Padrão "DD/mês/AAAA"
                        const day = parseInt(match[1]);
                        const monthName = match[2].toLowerCase();
                        const year = parseInt(match[3]);
                        const month = monthNames[monthName];
                        if (month !== undefined) {
                            parsedDate = new Date(year, month, day);
                        }
                    }
                    else {
                        // Padrões DD/MM/AAAA ou DD/MM/AA
                        const day = parseInt(match[1]);
                        const month = parseInt(match[2]) - 1; // JS months são 0-indexed
                        let year = parseInt(match[3]);
                        // Converter anos de 2 dígitos
                        if (year < 100) {
                            year += year < 50 ? 2000 : 1900;
                        }
                        parsedDate = new Date(year, month, day);
                    }
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        // Calcular dias a partir de hoje
                        const diffTime = parsedDate.getTime() - today.getTime();
                        const daysFromNow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        // Determinar importância baseada no contexto
                        const contextLower = dateContext.toLowerCase();
                        let importance = "low";
                        if (criticalContexts.some(ctx => contextLower.includes(ctx))) {
                            importance = "critical";
                        }
                        else if (highContexts.some(ctx => contextLower.includes(ctx))) {
                            importance = "high";
                        }
                        else if (mediumContexts.some(ctx => contextLower.includes(ctx))) {
                            importance = "medium";
                        }
                        // Boost de importância para datas próximas
                        if (daysFromNow >= 0 && daysFromNow <= 10 && importance !== "critical") {
                            importance = importance === "low" ? "medium" : "high";
                        }
                        dates.push({
                            date: parsedDate.toISOString().split('T')[0],
                            originalText: fullMatch,
                            context: dateContext.replace(/\s+/g, ' '),
                            importance,
                            daysFromNow,
                        });
                    }
                }
            }
            // Remover duplicatas e ordenar por data
            const uniqueDates = dates.filter((date, index, self) => index === self.findIndex(d => d.date === date.date && d.context === date.context)).sort((a, b) => a.daysFromNow - b.daysFromNow);
            console.log(`📊 Tool: extractDatesFromText - ${uniqueDates.length} datas únicas encontradas`);
            return {
                dates: uniqueDates,
                totalDatesFound: uniqueDates.length,
            };
        }
        catch (error) {
            console.error("❌ Erro na tool extractDatesFromText:", error);
            return {
                dates: [],
                totalDatesFound: 0,
            };
        }
    },
});
