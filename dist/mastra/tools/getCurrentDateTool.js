"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentDate = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
exports.getCurrentDate = (0, tools_1.createTool)({
    id: "getCurrentDate",
    description: "Retorna a data e hora atual com informações contextuais para análise de prazos",
    inputSchema: zod_1.z.object({
        includeTime: zod_1.z.boolean().optional().default(true).describe("Incluir horário na resposta"),
        timezone: zod_1.z.string().optional().default("America/Sao_Paulo").describe("Timezone para a data"),
    }),
    outputSchema: zod_1.z.object({
        currentDate: zod_1.z.string().describe("Data atual no formato YYYY-MM-DD"),
        currentDateTime: zod_1.z.string().describe("Data e hora atual no formato ISO"),
        brazilianDate: zod_1.z.string().describe("Data no formato brasileiro DD/MM/AAAA"),
        brazilianDateTime: zod_1.z.string().describe("Data e hora no formato brasileiro"),
        weekday: zod_1.z.string().describe("Dia da semana"),
        isBusinessDay: zod_1.z.boolean().describe("Se é dia útil (segunda a sexta)"),
        dayOfYear: zod_1.z.number().describe("Dia do ano (1-365/366)"),
        weekOfYear: zod_1.z.number().describe("Semana do ano"),
    }),
    execute: async ({ context }) => {
        try {
            console.log(`🕒 Tool: getCurrentDate - Obtendo data atual (timezone: ${context.timezone})`);
            const now = new Date();
            // Configurar timezone brasileiro
            const options = {
                timeZone: context.timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            };
            const brazilianFormatter = new Intl.DateTimeFormat('pt-BR', options);
            const parts = brazilianFormatter.formatToParts(now);
            // Extrair componentes da data
            const year = parts.find(p => p.type === 'year')?.value || '';
            const month = parts.find(p => p.type === 'month')?.value || '';
            const day = parts.find(p => p.type === 'day')?.value || '';
            const hour = parts.find(p => p.type === 'hour')?.value || '';
            const minute = parts.find(p => p.type === 'minute')?.value || '';
            const second = parts.find(p => p.type === 'second')?.value || '';
            // Formatos de data
            const currentDate = `${year}-${month}-${day}`;
            const currentDateTime = now.toISOString();
            const brazilianDate = `${day}/${month}/${year}`;
            const brazilianDateTime = context.includeTime ?
                `${day}/${month}/${year} ${hour}:${minute}:${second}` :
                brazilianDate;
            // Dia da semana
            const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const weekday = weekdays[now.getDay()];
            // Verificar se é dia útil (segunda a sexta)
            const dayOfWeek = now.getDay();
            const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5;
            // Calcular dia do ano
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            // Calcular semana do ano
            const startOfYearWeekday = startOfYear.getDay();
            const weekOfYear = Math.ceil((dayOfYear + startOfYearWeekday - 1) / 7);
            console.log(`📊 Tool: getCurrentDate - Data atual: ${brazilianDate} (${weekday}, ${isBusinessDay ? 'dia útil' : 'fim de semana'})`);
            return {
                currentDate,
                currentDateTime,
                brazilianDate,
                brazilianDateTime,
                weekday,
                isBusinessDay,
                dayOfYear,
                weekOfYear,
            };
        }
        catch (error) {
            console.error("❌ Erro na tool getCurrentDate:", error);
            // Fallback com Date simples
            const fallbackDate = new Date();
            return {
                currentDate: fallbackDate.toISOString().split('T')[0],
                currentDateTime: fallbackDate.toISOString(),
                brazilianDate: fallbackDate.toLocaleDateString('pt-BR'),
                brazilianDateTime: fallbackDate.toLocaleString('pt-BR'),
                weekday: fallbackDate.toLocaleDateString('pt-BR', { weekday: 'long' }),
                isBusinessDay: fallbackDate.getDay() >= 1 && fallbackDate.getDay() <= 5,
                dayOfYear: Math.floor((fallbackDate.getTime() - new Date(fallbackDate.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1,
                weekOfYear: Math.ceil((Math.floor((fallbackDate.getTime() - new Date(fallbackDate.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1) / 7),
            };
        }
    },
});
