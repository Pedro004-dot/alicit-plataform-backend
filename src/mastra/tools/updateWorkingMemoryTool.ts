import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tool para atualizar working memory com resultados da análise
 * Permite que agentes atualizem o estado global progressivamente
 */
export const updateWorkingMemory = createTool({
  id: "updateWorkingMemory",
  description: "Atualiza a working memory com resultados da análise atual",
  inputSchema: z.object({
    section: z.string().describe("Seção a ser atualizada (ex: 'Agente Aderência')"),
    content: z.string().describe("Conteúdo da atualização"),
    score: z.number().min(0).max(100).optional().describe("Score da análise (0-100)"),
    status: z.enum(["Pendente", "Em Análise", "Concluído", "Rejeitado"]).describe("Status da análise")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    updatedSection: z.string()
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
      if (score !== undefined) console.log(`   Score: ${score}/100`);
      console.log(`   Status: ${status}`);
      
      return {
        success: true,
        message: `Working memory atualizada - Seção: ${section}`,
        updatedSection: section
      };
    } catch (error) {
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
function updateMemorySection(
  currentMemory: string, 
  section: string, 
  content: string, 
  score?: number, 
  status?: string
): string {
  const scoreText = score !== undefined ? ` (Score: ${score}/100)` : "";
  const statusText = status ? ` - Status: ${status}` : "";
  const fullUpdate = `- **${section}**: ${content}${scoreText}${statusText}`;
  
  // Regex para encontrar e substituir a seção
  const sectionRegex = new RegExp(`- \\*\\*${section}\\*\\*:.*`, 'g');
  
  if (sectionRegex.test(currentMemory)) {
    return currentMemory.replace(sectionRegex, fullUpdate);
  } else {
    // Se seção não existe, adiciona no final da análise progressiva
    return currentMemory.replace(
      /## ANÁLISE PROGRESSIVA ATUAL[\s\S]*?(##|$)/,
      (match) => match.replace(/(?=##|\n$|$)/, `${fullUpdate}\n`)
    );
  }
}