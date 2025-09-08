"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLegalData = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
/**
 * Tool para extrair dados jurídico-documentais da licitação
 * Foca em requisitos de habilitação, documentos e cláusulas de risco
 */
exports.extractLegalData = (0, tools_1.createTool)({
    id: "extractLegalData",
    description: "Extrai requisitos de habilitação, documentos obrigatórios e cláusulas de risco",
    inputSchema: zod_1.z.object({
        licitacaoId: zod_1.z.string().describe("ID da licitação para análise"),
        focusAreas: zod_1.z.array(zod_1.z.enum([
            "habilitacao_juridica",
            "habilitacao_tecnica",
            "habilitacao_fiscal",
            "habilitacao_economica",
            "clausulas_penalidades",
            "prazos_documentos"
        ])).describe("Áreas específicas de foco na extração")
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        licitacaoId: zod_1.z.string(),
        extractedData: zod_1.z.record(zod_1.z.any()),
        message: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { licitacaoId, focusAreas } = context;
            // Simula extração de dados jurídico-documentais
            // Em produção, conectaria com banco vetorizado da licitação
            const legalData = await extractLegalDataFromEdital(licitacaoId, focusAreas);
            return {
                success: true,
                licitacaoId,
                extractedData: legalData,
                message: `Dados jurídico-documentais extraídos com sucesso`
            };
        }
        catch (error) {
            const { licitacaoId } = context;
            return {
                success: false,
                licitacaoId,
                message: `Erro na extração de dados legais: ${error}`,
                extractedData: {}
            };
        }
    }
});
/**
 * Função auxiliar para extrair dados jurídico-documentais usando Pinecone
 */
async function extractLegalDataFromEdital(licitacaoId, focusAreas) {
    try {
        // Construir query baseada nas áreas de foco
        const queryTerms = focusAreas.map(area => {
            switch (area) {
                case "habilitacao_juridica": return "habilitação jurídica documentos societários CNPJ";
                case "habilitacao_tecnica": return "habilitação técnica atestados capacidade";
                case "habilitacao_fiscal": return "habilitação fiscal certidões FGTS INSS";
                case "habilitacao_economica": return "habilitação econômica balanço demonstrações financeiras";
                case "clausulas_penalidades": return "penalidades multas cláusulas sanções";
                case "prazos_documentos": return "prazos documentação entrega";
                default: return area;
            }
        }).join(" ");
        // TODO: Implementar busca real no Pinecone
        // const pineconeResults = await queryPinecone(licitacaoId, queryTerms);
        // return processLegalResults(pineconeResults, focusAreas);
        // Estrutura vazia até integração do Pinecone
        const emptyData = {};
        focusAreas.forEach(area => {
            emptyData[area] = {
                status: "Dados não disponíveis - Pinecone não configurado",
                detalhes: []
            };
        });
        return emptyData;
    }
    catch (error) {
        throw new Error(`Erro na extração de dados legais: ${error}`);
    }
}
