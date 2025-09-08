import { createTool } from "@mastra/core/tools";
import { z } from "zod";
/**
 * Tool para comparar documentos da empresa com requisitos da licitação
 * Identifica gaps de documentação e status de adequação
 */
export const compareDocuments = createTool({
    id: "compareDocuments",
    description: "Compara documentos disponíveis da empresa com requisitos da licitação",
    inputSchema: z.object({
        empresaId: z.string().describe("ID da empresa para consulta de documentos"),
        requiredDocuments: z.array(z.object({
            tipo: z.string(),
            descricao: z.string(),
            validade_minima: z.string().optional()
        })).describe("Lista de documentos exigidos pela licitação"),
        categoria: z.enum([
            "juridica",
            "tecnica",
            "fiscal",
            "economica"
        ]).describe("Categoria de habilitação")
    }),
    outputSchema: z.object({
        success: z.boolean(),
        empresaId: z.string().optional(),
        categoria: z.string().optional(),
        comparison: z.record(z.any()),
        adequacaoPercentual: z.number(),
        documentosFaltantes: z.array(z.any()).optional(),
        documentosVencidos: z.array(z.any()).optional(),
        message: z.string()
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
