"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkingMemory = exports.capturedScores = void 0;
exports.resetCapturedScores = resetCapturedScores;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
// Global score store para capturar scores dos agentes
exports.capturedScores = {
    strategic: 0,
    operational: 0,
    legal: 0,
    financial: 0
};
function resetCapturedScores() {
    exports.capturedScores = { strategic: 0, operational: 0, legal: 0, financial: 0 };
}
/**
 * Tool para atualizar working memory com resultados da análise
 * Permite que agentes atualizem o estado global progressivamente
 */
exports.updateWorkingMemory = (0, tools_1.createTool)({
    id: "updateWorkingMemory",
    description: "Atualiza a working memory com resultados da análise atual",
    inputSchema: zod_1.z.object({
        section: zod_1.z.string().describe("Seção a ser atualizada (ex: 'Agente Aderência')"),
        content: zod_1.z.string().describe("Conteúdo da atualização"),
        score: zod_1.z.number().min(0).max(100).optional().describe("Score da análise (0-100)"),
        status: zod_1.z.enum(["Pendente", "Em Análise", "Concluído", "Rejeitado"]).describe("Status da análise")
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        message: zod_1.z.string(),
        updatedSection: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { section, content, score, status } = context;
            console.log('🧠 WORKING MEMORY TOOL - Dados recebidos:');
            console.log('  section:', section);
            console.log('  content (primeiros 150 chars):', content?.substring(0, 150));
            console.log('  score:', score);
            console.log('  status:', status);
            // Capturar score baseado na seção
            if (score !== undefined && score > 0) {
                if (section.toLowerCase().includes('aderência') || section.toLowerCase().includes('estratégic')) {
                    exports.capturedScores.strategic = score;
                    console.log(`🎯 [SCORE CAPTURE] Strategic score capturado: ${score}`);
                }
                else if (section.toLowerCase().includes('operacional')) {
                    exports.capturedScores.operational = score;
                    console.log(`🎯 [SCORE CAPTURE] Operational score capturado: ${score}`);
                }
                else if (section.toLowerCase().includes('jurídic') || section.toLowerCase().includes('legal')) {
                    exports.capturedScores.legal = score;
                    console.log(`🎯 [SCORE CAPTURE] Legal score capturado: ${score}`);
                }
                else if (section.toLowerCase().includes('financeiro') || section.toLowerCase().includes('financial')) {
                    exports.capturedScores.financial = score;
                    console.log(`🎯 [SCORE CAPTURE] Financial score capturado: ${score}`);
                }
            }
            console.log(`📝 Working Memory atualizada:`);
            console.log(`   Seção: ${section}`);
            console.log(`   Conteúdo: ${content}`);
            if (score !== undefined)
                console.log(`   Score: ${score}/100`);
            console.log(`   Status: ${status}`);
            return {
                success: true,
                message: `Working memory atualizada - Seção: ${section}`,
                updatedSection: section
            };
        }
        catch (error) {
            console.log('❌ WORKING MEMORY TOOL - Erro:', error);
            return {
                success: false,
                message: `Erro ao atualizar working memory: ${error}`,
                updatedSection: ""
            };
        }
    }
});
/**
 * Função auxiliar para atualizar seção específica da working memory
 */
function updateMemorySection(currentMemory, section, content, score, status) {
    const scoreText = score !== undefined ? ` (Score: ${score}/100)` : "";
    const statusText = status ? ` - Status: ${status}` : "";
    const fullUpdate = `- **${section}**: ${content}${scoreText}${statusText}`;
    // Regex para encontrar e substituir a seção
    const sectionRegex = new RegExp(`- \\*\\*${section}\\*\\*:.*`, 'g');
    if (sectionRegex.test(currentMemory)) {
        return currentMemory.replace(sectionRegex, fullUpdate);
    }
    else {
        // Se seção não existe, adiciona no final da análise progressiva
        return currentMemory.replace(/## ANÁLISE PROGRESSIVA ATUAL[\s\S]*?(##|$)/, (match) => match.replace(/(?=##|\n$|$)/, `${fullUpdate}\n`));
    }
}
