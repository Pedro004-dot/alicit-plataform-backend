"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkingMemory = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
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
            // TODO: Implementar integração com working memory do Mastra
            // Por enquanto, apenas simula a atualização
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
