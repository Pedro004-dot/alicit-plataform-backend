"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareDocuments = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
/**
 * Tool para comparar documentos da empresa com requisitos da licitação
 * Identifica gaps de documentação e status de adequação
 */
exports.compareDocuments = (0, tools_1.createTool)({
    id: "compareDocuments",
    description: "Compara documentos disponíveis da empresa com requisitos da licitação",
    inputSchema: zod_1.z.object({
        empresaId: zod_1.z.string().describe("ID da empresa para consulta de documentos"),
        requiredDocuments: zod_1.z.array(zod_1.z.object({
            tipo: zod_1.z.string(),
            descricao: zod_1.z.string(),
            validade_minima: zod_1.z.string().optional()
        })).describe("Lista de documentos exigidos pela licitação"),
        categoria: zod_1.z.enum([
            "juridica",
            "tecnica",
            "fiscal",
            "economica"
        ]).describe("Categoria de habilitação")
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        empresaId: zod_1.z.string().optional(),
        categoria: zod_1.z.string().optional(),
        comparison: zod_1.z.record(zod_1.z.any()),
        adequacaoPercentual: zod_1.z.number(),
        documentosFaltantes: zod_1.z.array(zod_1.z.any()).optional(),
        documentosVencidos: zod_1.z.array(zod_1.z.any()).optional(),
        message: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { empresaId, requiredDocuments, categoria } = context;
            // Consulta documentos disponíveis da empresa
            const availableDocuments = await getEmpresaDocuments(empresaId, categoria);
            // Compara com requisitos
            const comparison = compareDocumentRequirements(availableDocuments, requiredDocuments);
            // Calcula adequação percentual
            const totalRequired = requiredDocuments.length;
            const compliant = comparison.compliant.length;
            const adequacaoPercentual = totalRequired > 0 ? (compliant / totalRequired) * 100 : 0;
            return {
                success: true,
                empresaId,
                categoria,
                comparison,
                adequacaoPercentual,
                documentosFaltantes: comparison.missing,
                documentosVencidos: comparison.expired,
                message: `Comparação de documentos concluída`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Erro na comparação de documentos: ${error}`,
                comparison: {},
                adequacaoPercentual: 0
            };
        }
    }
});
/**
 * Função auxiliar para consultar documentos da empresa no Supabase
 */
async function getEmpresaDocuments(empresaId, categoria) {
    try {
        // TODO: Implementar consulta real no Supabase
        // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        // 
        // const { data: documentos, error } = await supabase
        //   .from('empresa_documentos')
        //   .select('*')
        //   .eq('empresa_id', empresaId)
        //   .eq('categoria', categoria);
        // 
        // if (error) throw new Error(`Erro ao consultar documentos: ${error.message}`);
        // return documentos || [];
        // Retorna array vazio até integração do Supabase
        console.log(`Consultando documentos da categoria ${categoria} para empresa ${empresaId} - Supabase não configurado`);
        return [];
    }
    catch (error) {
        throw new Error(`Erro ao consultar documentos da empresa: ${error}`);
    }
}
/**
 * Função auxiliar para comparar documentos
 */
function compareDocumentRequirements(available, required) {
    const comparison = {
        compliant: [],
        missing: [],
        expired: [],
        partial: []
    };
    required.forEach(reqDoc => {
        const matchingDoc = available.find(availDoc => availDoc.tipo.includes(reqDoc.tipo) ||
            reqDoc.tipo.includes(availDoc.tipo) ||
            availDoc.descricao.toLowerCase().includes(reqDoc.tipo.toLowerCase()));
        if (!matchingDoc) {
            comparison.missing.push(reqDoc);
        }
        else if (matchingDoc.status === "vencido") {
            comparison.expired.push({
                required: reqDoc,
                available: matchingDoc
            });
        }
        else {
            comparison.compliant.push({
                required: reqDoc,
                available: matchingDoc
            });
        }
    });
    return comparison;
}
