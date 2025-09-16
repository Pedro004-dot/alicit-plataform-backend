import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Global score store para capturar scores dos agentes
export let capturedScores = {
  strategic: 0,
  operational: 0,
  legal: 0,
  financial: 0
};

export function resetCapturedScores() {
  capturedScores = { strategic: 0, operational: 0, legal: 0, financial: 0 };
}

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
      
      // Capturar score baseado na seção
      if (score !== undefined && score > 0) {
        if (section.toLowerCase().includes('aderência') || section.toLowerCase().includes('estratégic')) {
          capturedScores.strategic = score;
          console.log(`🎯 [SCORE CAPTURE] Strategic score capturado: ${score}`);
        } else if (section.toLowerCase().includes('operacional')) {
          capturedScores.operational = score;
          console.log(`🎯 [SCORE CAPTURE] Operational score capturado: ${score}`);
        } else if (section.toLowerCase().includes('jurídic') || section.toLowerCase().includes('legal')) {
          capturedScores.legal = score;
          console.log(`🎯 [SCORE CAPTURE] Legal score capturado: ${score}`);
        } else if (section.toLowerCase().includes('financeiro') || section.toLowerCase().includes('financial')) {
          capturedScores.financial = score;
          console.log(`🎯 [SCORE CAPTURE] Financial score capturado: ${score}`);
        }
      }
      
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