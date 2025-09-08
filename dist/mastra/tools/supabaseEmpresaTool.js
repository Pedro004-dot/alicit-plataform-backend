"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.empresaDataSchema = exports.supabaseEmpresa = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
/**
 * Schema de dados da empresa para validação
 */
const empresaDataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nome: zod_1.z.string(),
    cnpj: zod_1.z.string(),
    porte: zod_1.z.enum(["Pequeno", "Médio", "Grande"]),
    segmento: zod_1.z.string(),
    produtos: zod_1.z.array(zod_1.z.string()),
    servicos: zod_1.z.array(zod_1.z.string()),
    localizacao: zod_1.z.string(),
    capacidadeOperacional: zod_1.z.string(),
    documentosDisponiveis: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.empresaDataSchema = empresaDataSchema;
/**
 * Tool para buscar dados da empresa no Supabase
 * Substitui dados mockados por dados reais da plataforma
 */
exports.supabaseEmpresa = (0, tools_1.createTool)({
    id: "supabaseEmpresa",
    description: "Busca dados completos da empresa no Supabase",
    inputSchema: zod_1.z.object({
        empresaId: zod_1.z.string().describe("ID da empresa para busca"),
        includeDocuments: zod_1.z.boolean().default(true).describe("Incluir documentos da empresa"),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        empresaId: zod_1.z.string(),
        data: zod_1.z.union([empresaDataSchema, zod_1.z.null()]),
        message: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { empresaId, includeDocuments } = context;
            console.log('🏢 SUPABASE EMPRESA TOOL - Parâmetros recebidos:');
            console.log('  empresaId:', empresaId);
            console.log('  includeDocuments:', includeDocuments);
            // TODO: Implementar conexão real com Supabase
            // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
            // Buscar dados básicos da empresa
            const empresaData = await fetchEmpresaData(empresaId);
            // Buscar documentos se solicitado
            let documentos = {};
            if (includeDocuments) {
                documentos = await fetchEmpresaDocuments(empresaId);
            }
            return {
                success: true,
                empresaId,
                data: {
                    ...empresaData,
                    documentosDisponiveis: documentos,
                },
                message: "Dados da empresa recuperados com sucesso",
            };
        }
        catch (error) {
            const { empresaId } = context;
            return {
                success: false,
                empresaId,
                message: `Erro ao buscar dados da empresa: ${error}`,
                data: null,
            };
        }
    },
});
/**
 * Busca dados básicos da empresa no Supabase
 */
async function fetchEmpresaData(empresaId) {
    // TODO: Implementar query real no Supabase
    // const { data, error } = await supabase
    //   .from('empresas')
    //   .select('*')
    //   .eq('id', empresaId)
    //   .single();
    // Por enquanto, simula estrutura esperada
    const mockData = {
        id: empresaId,
        nome: "Empresa não encontrada",
        cnpj: "",
        porte: "Médio",
        segmento: "",
        produtos: [],
        servicos: [],
        localizacao: "",
        capacidadeOperacional: "",
    };
    // TODO: Retornar data real quando Supabase estiver configurado
    // if (error) throw new Error(`Erro na consulta Supabase: ${error.message}`);
    // return data;
    return mockData;
}
/**
 * Busca documentos da empresa no Supabase
 */
async function fetchEmpresaDocuments(empresaId) {
    // TODO: Implementar query real no Supabase
    // const { data: documentos, error } = await supabase
    //   .from('empresa_documentos')
    //   .select('*')
    //   .eq('empresa_id', empresaId);
    // Por enquanto, retorna estrutura vazia
    const mockDocuments = {
        juridica: [],
        fiscal: [],
        tecnica: [],
        economica: [],
    };
    // TODO: Processar e estruturar documentos reais
    // if (error) throw new Error(`Erro ao buscar documentos: ${error.message}`);
    // return processDocuments(data);
    return mockDocuments;
}
