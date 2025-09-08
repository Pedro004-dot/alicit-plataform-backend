import { createTool } from "@mastra/core/tools";
import { z } from "zod";
/**
 * Tool para extrair dados financeiros da licitação
 * Foca em valores, modalidade, garantias e condições de pagamento
 */
export const extractFinancialData = createTool({
    id: "extractFinancialData",
    description: "Extrai dados financeiros da licitação: valores, modalidade, garantias e pagamento",
    inputSchema: z.object({
        licitacaoId: z.string().describe("ID da licitação para análise"),
        extractionType: z.enum([
            "valores_contratuais",
            "modalidade_licitacao",
            "garantias_exigidas",
            "condicoes_pagamento",
            "analise_completa"
        ]).describe("Tipo de extração financeira")
    }),
    outputSchema: z.object({
        success: z.boolean(),
        licitacaoId: z.string().optional(),
        extractionType: z.string().optional(),
        financialData: z.record(z.any()),
        message: z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { licitacaoId, extractionType } = context;
            // Extrai dados financeiros específicos
            const financialData = await extractFinancialDataFromEdital(licitacaoId, extractionType);
            return {
                success: true,
                licitacaoId,
                extractionType,
                financialData,
                message: `Dados financeiros extraídos com sucesso`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Erro na extração de dados financeiros: ${error}`,
                financialData: {}
            };
        }
    }
});
/**
 * Função auxiliar para extrair dados financeiros usando Pinecone
 */
async function extractFinancialDataFromEdital(licitacaoId, extractionType) {
    try {
        // Mapear tipo de extração para queries específicas
        const queryMap = {
            valores_contratuais: "valor estimado máximo preço total unitário",
            modalidade_licitacao: "modalidade pregão concorrência tipo licitação",
            garantias_exigidas: "garantia contratual seguro fiança percentual",
            condicoes_pagamento: "pagamento prazo dias forma reajuste",
            analise_completa: "valores financeiros modalidade garantias pagamento"
        };
        const query = queryMap[extractionType] || extractionType;
        // TODO: Implementar busca real no Pinecone
        // const pineconeResults = await queryPinecone(licitacaoId, query);
        // return processFinancialResults(pineconeResults, extractionType);
        // Estrutura vazia até integração do Pinecone
        const emptyData = {
            [extractionType]: {
                status: "Dados não disponíveis - Pinecone não configurado",
                detalhes: {}
            }
        };
        if (extractionType === "analise_completa") {
            return {
                valores_contratuais: { status: "Não disponível" },
                modalidade_licitacao: { status: "Não disponível" },
                garantias_exigidas: { status: "Não disponível" },
                condicoes_pagamento: { status: "Não disponível" }
            };
        }
        return emptyData;
    }
    catch (error) {
        throw new Error(`Erro na extração de dados financeiros: ${error}`);
    }
}
