"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoEmpresaRepository_1 = __importDefault(require("../../repositories/licitacaoEmpresaRepository"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
const supabaseLicitacaoRepository_1 = __importDefault(require("../../repositories/supabaseLicitacaoRepository"));
const licitacaoDecisaoRepository_1 = __importDefault(require("../../repositories/licitacaoDecisaoRepository"));
const statusValidos = [
    "nao_definido", "selecionada", "nao_analisado", "em_analise", "analisado", "proposta", "enviada",
    "vencida", "recusada", "perdida"
];
const validarStatus = (status) => {
    return statusValidos.includes(status);
};
const criar = async (data) => {
    const status = data.status || "nao_definido";
    if (!validarStatus(status)) {
        throw new Error(`Status inválido: ${status}`);
    }
    return await licitacaoEmpresaRepository_1.default.criar({
        ...data,
        status
    });
};
const atualizarStatus = async (id, novoStatus) => {
    if (!validarStatus(novoStatus)) {
        throw new Error(`Status inválido: ${novoStatus}`);
    }
    return await licitacaoEmpresaRepository_1.default.atualizarStatus(id, novoStatus);
};
const listarPorEmpresa = async (cnpj) => {
    return await licitacaoEmpresaRepository_1.default.listarPorEmpresa(cnpj);
};
const buscarPorId = async (id) => {
    const licitacao = await licitacaoEmpresaRepository_1.default.buscarPorId(id);
    if (!licitacao) {
        throw new Error("Licitação não encontrada");
    }
    return licitacao;
};
const buscarOuCriar = async (numeroControlePNCP, empresaCnpj) => {
    const existente = await licitacaoEmpresaRepository_1.default.buscarPorChaves(numeroControlePNCP, empresaCnpj);
    if (existente) {
        return existente;
    }
    // ✅ NOVA LÓGICA: Garantir que a licitação existe no Supabase antes de criar o relacionamento
    console.log(`🔍 Verificando se licitação ${numeroControlePNCP} existe no Supabase...`);
    try {
        const licitacaoExistente = await licitacaoDecisaoRepository_1.default.getLicitacao(numeroControlePNCP);
        if (!licitacaoExistente) {
            console.log(`📥 Licitação ${numeroControlePNCP} não encontrada no Supabase, buscando no Pinecone...`);
            // Buscar do Supabase primeiro, depois Pinecone como fallback
            let licitacaoEncontrada = await supabaseLicitacaoRepository_1.default.getLicitacao(numeroControlePNCP);
            if (!licitacaoEncontrada) {
                console.log(`📥 Licitação ${numeroControlePNCP} não encontrada no Supabase, buscando no Pinecone...`);
                licitacaoEncontrada = await pineconeLicitacaoRepository_1.default.getLicitacao(numeroControlePNCP);
            }
            if (licitacaoEncontrada) {
                console.log(`💾 Salvando licitação ${numeroControlePNCP} no Supabase...`);
                await licitacaoDecisaoRepository_1.default.salvarLicitacaoCompleta(licitacaoEncontrada);
                console.log(`✅ Licitação ${numeroControlePNCP} sincronizada com sucesso`);
            }
            else {
                console.warn(`⚠️ Licitação ${numeroControlePNCP} não encontrada em nenhum banco`);
                throw new Error(`Licitação ${numeroControlePNCP} não encontrada`);
            }
        }
        else {
            console.log(`✅ Licitação ${numeroControlePNCP} já existe no Supabase`);
        }
    }
    catch (error) {
        console.error(`❌ Erro ao verificar/sincronizar licitação ${numeroControlePNCP}:`, error);
        throw error;
    }
    // Agora criar o relacionamento licitacao_empresa
    return await criar({
        numeroControlePNCP,
        cnpjEmpresa: empresaCnpj,
        status: "nao_definido"
    });
};
const atualizarStatusPorChaves = async (numeroControlePNCP, empresaCnpj, novoStatus) => {
    if (!validarStatus(novoStatus)) {
        throw new Error(`Status inválido: ${novoStatus}`);
    }
    const licitacao = await buscarOuCriar(numeroControlePNCP, empresaCnpj);
    return await licitacaoEmpresaRepository_1.default.atualizarStatus(licitacao.id, novoStatus);
};
const deletar = async (id) => {
    return await licitacaoEmpresaRepository_1.default.deletar(id);
};
const deletarPorStatus = async (statusList) => {
    const statusInvalidos = statusList.filter(status => !validarStatus(status));
    if (statusInvalidos.length > 0) {
        throw new Error(`Status inválidos: ${statusInvalidos.join(', ')}`);
    }
    return await licitacaoEmpresaRepository_1.default.deletarPorStatus(statusList);
};
exports.default = {
    criar,
    atualizarStatus,
    atualizarStatusPorChaves,
    listarPorEmpresa,
    buscarPorId,
    buscarOuCriar,
    deletar,
    deletarPorStatus,
    statusValidos
};
